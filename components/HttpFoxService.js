/*
	HttpFox - An HTTP analyzer addon for Firefox
	Copyright (C) 2008 Martin Theimer
	
	This program is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; either version 2 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the GNU General Public License
	along with this program; if not, write to the Free Software
	Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
*/

/***********************************************************
constants
***********************************************************/
// standard shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

const nsISupports = Ci.nsISupports; // reference to the required base interface that all components must support
const CLASS_ID = Components.ID("{307fd88d-5c81-4487-bb0d-42e228a68767}"); // UUID uniquely identifying our component
const CLASS_NAME = "HttpFox Service"; // description
const CONTRACT_ID = "@decoded.net/httpfox;1"; // textual unique identifier

try 
{
	Cu["import"]("resource://gre/modules/XPCOMUtils.jsm");
}
catch(e)
{	
	dump("XPCOMUtils Import Exc: " + e + "\n");
}

/***********************************************************
class definition
***********************************************************/
function HttpFoxService() 
{
	//dump("service constructor\n");
	try 
	{
		// import modules
		Cu["import"]("resource://httpfox/Utils.jsm");
		Cu["import"]("resource://httpfox/HttpFoxObserver.jsm");
		Cu["import"]("resource://httpfox/HttpFoxRequestStore.jsm");
		Cu["import"]("resource://httpfox/HttpFoxPreferences.jsm");
	}
	catch (e) 
	{
		dump("e: " + e);
	}
	
	this.wrappedJSObject = this;
	
	this.RequestStore = new HttpFoxRequestStore(this);
	this.Observer = new HttpFoxObserver(this);
	//this.Observer.start();

	this.Controllers = new Array();
	//this.Requests = new Array();
	//this.PendingRequests = new Array();
	//this.StartTime = new Date();
	this.Timestamp_StartService = HFU.now();
	this.Preferences = new HttpFoxPreferences();
	if (this.Preferences.StartAtBrowserStart)
	{
		this.startWatching();
	}
};

HttpFoxService.prototype = 
{
	classID: CLASS_ID,
	classDescription: CLASS_NAME,
	contractID: CONTRACT_ID,

	// Controller/Interface list
	Controllers: null,
	// Request Observer
	Observer: null,
	RequestStore: null,

	// All requests (holds HttpFoxRequest objects)
	Requests: null,
	// All pending requests (isPending == true)
	PendingRequests: null,
	// session start timestamp
	StartTime: null,
	// is observer currently running
	IsWatching: false,
	// user preferences
	Preferences: null,
	// detach window reference
	HttpFoxWindow: null,
	
	requestAdded: function(request)
	{
		// check filter
		this.callControllerMethod("filterRequest", {"p1" : request});
		//this.callControllerMethod("redrawRequestTreePlusOne");
	},

	requestUpdated: function(request)
	{
		this.callControllerMethod("redrawRequestTreeRow", {"p1": request});
		//this.callControllerMethod("redrawRequestTree");
	},

	addController: function(httpFoxControllerReference)
	{
		this.Controllers.push(httpFoxControllerReference);
		httpFoxControllerReference.ControllerIndex = this.Controllers.length;
	},
	
	removeController: function(httpFoxControllerReference)
	{
		for (var i = 0; i < this.Controllers.length; i++)
		{
			if (this.Controllers[i] === httpFoxControllerReference)
			{
				this.Controllers.splice(i, 1);
				break;
			}
		}
	},

	callControllerMethod: function(methodName, parameterArray)
	{
		for (var c in this.Controllers)
		{
			this.Controllers[c][methodName].call(this.Controllers[c], parameterArray);
		}
	},
	
	startWatching: function() 
	{
		this.Observer.start();
		this.IsWatching = true;
	},
	
	stopWatching: function() 
	{
		this.Observer.stop();
		// TODO: detach eventsink and streamlistener
		this.IsWatching = false;
	},
	
	clearRequests: function()
	{
		this.RequestStore.clearRequests();

		this.Timestamp_StartService = HFU.now();
	},
	
	windowIsClosed: function()
	{
		this.callControllerMethod("windowIsClosed");
	},
	
	QueryInterface: function(aIid)
	{
		if (!aIid.equals(nsISupports))
		{
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	}
};

/***********************************************************
module definition (xpcom registration)
***********************************************************/
var HttpFoxServiceModule = 
{
	registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
	{
		aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
		aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
	},

	unregisterSelf: function(aCompMgr, aLocation, aType)
	{
		aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
		aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
	},

	getClassObject: function(aCompMgr, aCID, aIID)
	{
		if (!aIID.equals(Ci.nsIFactory))
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

		if (aCID.equals(CLASS_ID))
			return this.HttpFoxServiceFactory;

		throw Cr.NS_ERROR_NO_INTERFACE;
	},

	canUnload: function(aCompMgr) 
	{ 
		return true;
	},
	
	/***********************************************************
	class factory

	This object is a member of the global-scope Components.classes.
	It is keyed off of the contract ID. Eg:

	myHelloWorld = Components.classes["@dietrich.ganx4.com/helloworld;1"].
                          createInstance(Components.interfaces.nsIHelloWorld);

	***********************************************************/
	HttpFoxServiceFactory:
	{
		createInstance: function(aOuter, aIID)
		{
			if (aOuter != null)
				throw Cr.NS_ERROR_NO_AGGREGATION;
				
			return (new HttpFoxService()).QueryInterface(aIID);
		}
	}
};

// FF 2
/***********************************************************
module initialization

When the application registers the component, this function
is called.
***********************************************************/
function NSGetModule(aCompMgr, aFileSpec) 
{
	return HttpFoxServiceModule;
}

// FF 4+
if (typeof XPCOMUtils != "undefined")
{
	if (XPCOMUtils.generateNSGetFactory)
	{
		// FF 4+
		var NSGetFactory = XPCOMUtils.generateNSGetFactory([HttpFoxService]);
	}
}