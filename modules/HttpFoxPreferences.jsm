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
	this._ColorRequests = this.prefs.getBoolPref("ColorRequests");
	this._ShowDebugTab = this.prefs.getBoolPref("ShowDebugTab");
};

HttpFoxPreferences.prototype = 
{
	prefs: null,
	// Options
	_StartAtBrowserStart: null,
	_AlwaysOpenDetached: null,
	_ColorRequests: null,
	_ShowDebugTab: null,
		
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
				
			case "ColorRequests":
				this._ColorRequests = this.prefs.getBoolPref("ColorRequests");
				break;
				
			case "ShowDebugTab":
				this._ShowDebugTab = this.prefs.getBoolPref("ShowDebugTab");
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
	}
};