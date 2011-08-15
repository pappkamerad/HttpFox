var EXPORTED_SYMBOLS = [
	"HFU"
];

// standard shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

var HFU = {
	dumpln: function(s) 
	{
		dump(s + "\n");
	},

	now: function()
	{
		return (new Date()).getTime();
	},

	urlDecode: function(value)
	{
		var decoded = value.replace(/\+/g, " ");
		decoded = unescape(decoded);
	
		return decoded;
	},

	isHttpChannel: function(httpChannel)
	{
		try 
		{ 
			httpChannel.QueryInterface(Ci.nsIHttpChannel); 
			return true;
		} 
		catch (ex) 
		{ 
			//dump("not a HttpChannel (" + httpChannel + ")\n");
			return false;
		}
	},

	stripNewlines: function(text)
	{
		return text.replace(/(\r\n|\r|\n)/, "");
	},

	isXml: function(text)
	{
		if (text.match(/<\?xml[^\?>]*\?>/i))
		{
			// xml header found
			return true;
		}
	
		return this.stripNewlines(text).match(/<([^> ]+)( [^>]+)*>.*<\/\1>|<[^>]+\/>/i);
	},

	isContentTypeXml: function(typestring)
	{
		if (typestring.indexOf("xml") != -1) 
		{
			return true;
		}
	
		if (typestring.indexOf("rdf") != -1) 
		{
			return true;
		}
	
		if (typestring.indexOf("dtd") != -1) 
		{
			return true;
		}
	
		return false;
	},

	// Utility function to save data to clipboard
	toClipboard: function(data)
	{
		if (data) 
		{
			// clipboard helper
			try
			{
				var clipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
				clipboardHelper.copyString(data);
			} 
			catch(ex) 
			{
      			// do nothing, later code will handle the error
				dump("Unable to get the clipboard helper\n");
    		}
  		}
	},

	trim: function(value, type)
	{
		if (type == "left")
        {
            return value.replace(/^\s*/, '');
        }
	    if (type == "right") 
        {
            return value.replace(/\s*$/, '');
        }
	    if (type == "normalize") 
        {
            return this.trim(value.replace(/\s{2,}/g, ' '));
        }

	    return this.trim(this.trim(value, "left"), "right");
	},

	// Date and Time stuff
	formatTimeDifference: function(startTime, endTime)
	{
		if (startTime == null || endTime == null)
		{
			return "*";
		}
	
		// values ok
		var diff = endTime - startTime;
	
		var string = "";
		string += diff / 1000;
		var dummy = string.split(".");
		var after;
		if (dummy.length > 1) 
		{
			while (dummy[1].length < 3) dummy[1] += "0";
			after = (dummy[1]) ? dummy[1] : "000";
		}
		else 
		{
			after = "000";
		}
		return dummy[0] + "." + after;
	},

	dateFromUnixTimestamp: function (timestamp)
	{
		return new Date(timestamp * 1000);
	},

	formatDateTime: function (myDate)
	{
		if (myDate instanceof Date) 
		{
			return myDate.toLocaleString();	
		}
		else 
		{
			return this.formatDateTime(this.dateFromUnixTimestamp(myDate));
		}
	},

	formatTime: function (time)
	{
		var h = (time - (time % 3600000)) / 3600000;
		time = time - (h * 3600000);

		var m = (time - (time % 60000)) / 60000;
		time = time - (m * 60000);

		var s = (time - (time % 1000)) / 1000;
		time = time - (s * 1000);

		var ms = time;
	
		var string = "";
	
		string += this.lZero(h);
		string += ":" + this.lZero(m);
		string += ":" + this.lZero(s);
		string += "." + this.pad(ms, 3);
	
		return string;
	},

	humanizeSize: function (size, displayUntil)
	{
		if (isNaN(size))
		{
			return size;
		}
		var hsize = size;
		var hchar = "";
		var dotPos = -1;
		if (displayUntil == "undefined") 
		{
			displayUntil = 3;
		}
	
		if (size > 1073741824 && displayUntil <= 9)
		{
			hsize = size / 1073741824;
			hchar = "G";
		}
	
		if (size > 1048576 && displayUntil <= 6)
		{
			hsize = size / 1048576;
			hchar = "M";
		}
	
		if (size > 1024 && displayUntil <= 3)
		{
			hsize = size / 1024;
			hchar = "k";
		}
	
		hsize = hsize.toString();
	
		if ((dotPos = hsize.indexOf(".")) != -1)
		{
			hsize = hsize.substring(0, dotPos + 2);
		}
	
		return hsize + hchar;
	},

	lZero: function(x) 
	{	
		// after Dietmar Meier
		return (-x > -10 && x >= 0 && "0" || "") + x;
	},

	pad: function(val, len)
	{
		val = String(val);
		len = len || 2;
		while (val.length < len) val = "0" + val;
		return val;
	},

	// Get the cookies
	getStoredCookies: function(host, path)
	{
		var cookies = new Array();
    
		// If the host is set
		if(host)
		{
			var cookie = null;
			var cookieEnumeration = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager).enumerator;
			var cookieHost = null;
			var cookiePath = null;

			// Loop through the cookies
			while (cookieEnumeration.hasMoreElements())
			{
				cookie = cookieEnumeration.getNext().QueryInterface(Ci.nsICookie);

				cookieHost = cookie.host;
				cookiePath = cookie.path;

				// If there is a host and path for this cookie
				if(cookieHost && cookiePath)
				{
					// If the cookie host starts with '.'
					if(cookieHost.charAt(0) == ".")
					{
						cookieHost = cookieHost.substring(1);
					}

					// If the host and cookie host and path and cookie path match
					//if((host == cookieHost || host.indexOf("." + cookieHost) != -1) && (path == cookiePath || path.indexOf(cookiePath) == 0))
					if((host == cookieHost || host.indexOf("." + cookieHost) != -1) && (path == cookiePath || path.indexOf(cookiePath) == 0)) 
					{
						cookies.push(cookie);
					}
				}
			}
		}

		return cookies;
	}
}	