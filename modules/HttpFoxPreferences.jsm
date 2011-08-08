var EXPORTED_SYMBOLS = [
	"HttpFoxPreferences"
];

// standard shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

function HttpFoxPreferences() 
{
	// Register to receive notifications of preference changes
	this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.httpfox.");
	this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
	this.prefs.addObserver("", this, false);
	
	// init values
	this._StartAtBrowserStart = this.prefs.getBoolPref("StartAtBrowserStart");
	this._AlwaysOpenDetached = this.prefs.getBoolPref("AlwaysOpenDetached");
	this._ShowHttpFoxHelperRequests = this.prefs.getBoolPref("ShowHttpFoxHelperRequests");
	this._ColorRequests = this.prefs.getBoolPref("ColorRequests");
	this._ShowDebugTab = this.prefs.getBoolPref("ShowDebugTab");
	this._ForceCaching = this.prefs.getBoolPref("ForceCaching");
};

HttpFoxPreferences.prototype = 
{
	prefs: null,
	// Options
	_StartAtBrowserStart: null,
	_AlwaysOpenDetached: null,
	_ShowHttpFoxHelperRequests: null,
	_ColorRequests: null,
	_ShowDebugTab: null,
	_ForceCaching: null,
		
	shutdown: function()
	{
		this.prefs.removeObserver("", this);
	},
	
	observe: function(subject, topic, data)
	{
		if (topic != "nsPref:changed")
		{
			return;
		}

		switch(data)
		{
			case "StartAtBrowserStart":
				this._StartAtBrowserStart = this.prefs.getBoolPref("StartAtBrowserStart");
				break;
				
			case "AlwaysOpenDetached":
				this._AlwaysOpenDetached = this.prefs.getBoolPref("AlwaysOpenDetached");
				break;
				
			case "ShowHttpFoxHelperRequests":
				this._ShowHttpFoxHelperRequests = this.prefs.getBoolPref("ShowHttpFoxHelperRequests");
				break;
				
			case "ColorRequests":
				this._ColorRequests = this.prefs.getBoolPref("ColorRequests");
				break;
				
			case "ShowDebugTab":
				this._ShowDebugTab = this.prefs.getBoolPref("ShowDebugTab");
				break;
				
			case "ForceCaching":
				this._ForceCaching = this.prefs.getBoolPref("ForceCaching");
				break;
		}
	},
	
	get StartAtBrowserStart() 
	{ 
		return this._StartAtBrowserStart;
	},
	set StartAtBrowserStart(value) 
	{
		this._StartAtBrowserStart = value;
		this.prefs.setCharPref("StartAtBrowserStart", value);
	},
	
	get AlwaysOpenDetached() 
	{ 
		return this._AlwaysOpenDetached;
	},
	set AlwaysOpenDetached(value) 
	{
		this._AlwaysOpenDetached = value;
		this.prefs.setIntPref("AlwaysOpenDetached", value);
	},
	
	get ShowHttpFoxHelperRequests() 
	{ 
		return this._ShowHttpFoxHelperRequests;
	},
	set ShowHttpFoxHelperRequests(value) 
	{
		this._ShowHttpFoxHelperRequests = value;
		this.prefs.setBoolPref("ShowHttpFoxHelperRequests", value);
	},
	
	get ColorRequests() 
	{ 
		return this._ColorRequests;
	},
	set ColorRequests(value) 
	{
		this._ColorRequests = value;
		this.prefs.setBoolPref("ColorRequests", value);
	},
	
	get ShowDebugTab() 
	{ 
		return this._ShowDebugTab;
	},
	set ShowDebugTab(value) 
	{
		this._ShowDebugTab = value;
		this.prefs.setBoolPref("ShowDebugTab", value);
	},
	
	get ForceCaching() 
	{ 
		return this._ForceCaching;
	},
	set ForceCaching(value) 
	{
		this._ForceCaching = value;
		this.prefs.setBoolPref("ForceCaching", value);
	}
};