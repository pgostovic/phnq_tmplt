require("phnq_log").exec("phnq_tmplt", function(log)
{
	var phnq_core = require("phnq_core");

	var PARAM_REGEX = /_\{([^\}]*)\}(\{([^\}]*)\})?/g;

	var isSet = function(val)
	{
		return val != null && val != undefined;
	};

	var evalParamVals = function(params, evalBuf)
	{
		with(params)
		{
			return eval("({"+evalBuf.join(",")+"})");
		}
	};

	var evalComp = function(comp, params)
	{
		with(params)
		{
			return eval(comp);
		}
	};

	var evalParamValsSlow = function(params, comps, defaultValues)
	{
		var paramVals = {};
		var compsLen = comps.length;
		for(var i=1; i<compsLen; i+=2)
		{
			var comp = comps[i];
			var defaultVal = defaultValues[i];
			try
			{
				var val = evalComp(comp, params);
				paramVals["p"+i] = isSet(val) ? val : defaultVal;
			}
			catch(exx)
			{
				paramVals["p"+i] = defaultVal;
			}
		}
		return paramVals;
	};

	var phnq_tmplt =
	{
		Template: phnq_core.clazz(
		{
			init: function(txt)
			{
				this.txt = txt;
				this.comps = null;
				this.defaultValues = {};
			},

			parse: function()
			{
				this.comps = [];
				var txt = this.txt;
				var m;
				var idx = 0;
				while((m = PARAM_REGEX.exec(txt)))
				{
					this.comps.push(txt.substring(idx, m.index)); // static text
					this.comps.push(m[1]); // param name

					if(m[3])
						this.defaultValues[this.comps.length-1] = m[3];

					idx = PARAM_REGEX.lastIndex;
				}
				this.comps.push(txt.substring(idx)); // leftover static text
			},

			render: function(params)
			{
				if(!this.comps)
					this.parse();

				params = params || {};

				var comps = this.comps;
				var compsLen = comps.length;

				var paramVals;
				try // try fast method first -- all or nothing...
				{
					var evalBuf = [];
					for(var i=1; i<compsLen; i+=2)
					{
						var comp = comps[i];
						var defaultVal = this.defaultValues[i];
						if(defaultVal == undefined)
						{
							evalBuf.push("p"+i+":"+comp);
						}
						else
						{
							var val = "isSet("+comp+")?"+comp+":"+defaultVal;
							evalBuf.push("p"+i+":("+val+")");
						}
					}

					paramVals = evalParamVals(params, evalBuf);
				}
				catch(ex) // on error, try the slow, granular method...
				{
					log.warn("Caught error in fast parameterization -- using slow...", ex);
					paramVals = evalParamValsSlow(params, comps, this.defaultValues);
				}

				var buf = [];
				for(var i=0; i<compsLen; i++)
				{
					var comp = comps[i];
					if(i % 2)
						buf.push(paramVals["p"+i]);
					else
						buf.push(comps[i]);
				}

				return buf.join("");
			}
		});
	};

	if(phnq_core.isServer())
		module.exports = phnq_tmplt;
	else if(phnq_core.isClient())
		window.phnq_tmplt = phnq_tmplt;
});
