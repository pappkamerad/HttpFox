var EXPORTED_SYMBOLS = [
	"HttpFoxObserver"
];

// standard shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

function HttpFoxObserver(service)
{
	Cu["import"]("resource://httpfox/HttpFoxRequest.jsm");
	Cu["import"]("resource://httpfox/HttpFoxRequestStore.jsm");
	Cu["import"]("resource://httpfox/HttpFoxResponseStreamListener.jsm");
	Cu["import"]("resource://httpfox/HttpFoxEventProcessor.jsm");
	Cu["import"]("resource://httpfox/Utils.jsm");
	
	this.Service = service;
	this.RequestStore = service.RequestStore;
	this.EventProcessor = new HttpFoxEventProcessor(service);
};

HttpFoxObserver.prototype =
{
	// Properties
	Service: null, // NEEDED?
	RequestStore: null,
	EventProcessor: null,
	
	// start observing
	start: function ()
	{
		this.addListener();
	},

	// end observing
	stop: function ()
	{
		this.removeListener();
	},

	addListener: function ()
	{
		//dump("adding listeners\n");
		// Register listeners
		var observerService = Cc["@mozilla.org/observer-service;1"]
			.getService(Ci.nsIObserverService);
		observerService.addObserver(this, "http-on-modify-request", false);
		observerService.addObserver(this, "http-on-examine-response", false);
		observerService.addObserver(this, "http-on-examine-cached-response", false);

		var activityDistributor = Cc["@mozilla.org/network/http-activity-distributor;1"]
			.getService(Components.interfaces.nsIHttpActivityDistributor);
		activityDistributor.addObserver(this);
	},

	removeListener: function ()
	{
		// Unregistering listeners
		var observerService = Cc["@mozilla.org/observer-service;1"]
			.getService(Ci.nsIObserverService);
		observerService.removeObserver(this, "http-on-modify-request");
		observerService.removeObserver(this, "http-on-examine-response");
		observerService.removeObserver(this, "http-on-examine-cached-response");

		var activityDistributor = Cc["@mozilla.org/network/http-activity-distributor;1"]
			.getService(Components.interfaces.nsIHttpActivityDistributor);
		activityDistributor.removeObserver(this);
	},

	// nsIObserver
	observe: function (subject, topic, data)
	{
		if (topic == 'http-on-modify-request')
		{
			// check if this is a http request
			if (!HFU.isHttpChannel(subject)) { return; }

//			if (subject.loadGroup && 
//				subject.loadGroup.notificationCallbacks && 
//				subject.loadGroup.notificationCallbacks.OriginalListener)
//			{
//				dump(".:*:. loadGroup OriginalListener\n");
//			}

//			if (subject.loadGroup && subject.loadGroup.notificationCallbacks)
//			{
//				//dump("count: " + subject.loadGroup.activeCount + "\n");
//				//dump(".:*:. set loadGroup\n");
//				var myListener = new HttpFoxEventSink(subject.loadGroup.notificationCallbacks, this.EventProcessor);
//				subject.loadGroup.notificationCallbacks = myListener;
//			}
////			else if (subject.loadGroup)
////			{
////				dump(".:*:. loadgroup ubt no notificationCB: " + subject.loadGroup.notificationCallbacks + " - root CB:" + subject.notificationCallbacks + "\n");
////				var myListener = new HttpFoxEventSink(subject.notificationCallbacks, this.EventProcessor);
////				subject.loadGroup.notificationCallbacks = myListener;
////			}
//			else 
//			{
//				//dump(".:*:. set root\n");
//				var myListener = new HttpFoxEventSink(subject.notificationCallbacks, this.EventProcessor);
//				subject.notificationCallbacks = myListener;
//			}
			
			// register notification callbacks for everything
			var myListener = new HttpFoxEventSink(subject.notificationCallbacks, this.EventProcessor);
			subject.notificationCallbacks = myListener;

			//if (httpChannel.notificationCallbacks)
			//{
				//var myListener = new FoxyStreamListener(httpChannel.notificationCallbacks, this);
			
			// attach notification listener
			//var myListener = new HttpFoxEventSink(subject.notificationCallbacks, this.EventProcessor);
			//subject.notificationCallbacks = myListener;
			
			//}

			// process
			this.EventProcessor.onModifyRequest(subject);
		}
		else if (topic == 'http-on-examine-response')
		{
			// check if this is a http request
			if (!HFU.isHttpChannel(subject)) { return; }

			// process
			this.EventProcessor.onExamineResponse(subject);
		}
		else if (topic == 'http-on-examine-cached-response')
		{
			// check if this is a http request
			if (!HFU.isHttpChannel(subject)) { return; }

			// process
			this.EventProcessor.onExamineCachedResponse(subject);
		}
	},

	// nsIHttpActivity
	observeActivity: function(httpChannel, activityType, activitySubType, timestamp, extraSizeData, extraStringData)
    {
		// get request
		if (!HFU.isHttpChannel(httpChannel)) { return; }

		// process
		this.EventProcessor.onActivity(httpChannel, activityType, activitySubType, timestamp, extraSizeData, extraStringData);
    },
	
	// nsISupportsString
	data: "HttpFoxObserver",

	toString: function ()
	{
		return "HttpFoxObserver";
	},

	// nsISupports
	QueryInterface: function (iid)
	{
		if (!iid.equals(Ci.nsISupports) &&
			!iid.equals(Ci.nsISupportsWeakReference) &&
			!iid.equals(Ci.nsIObserver) &&
			!iid.equals(Ci.nsIStreamListener) &&
			!iid.equals(Ci.nsIRequestObserver) &&
			!iid.equals(Ci.nsISupportsString))
		{
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}

		return this;
	}
};

function HttpFoxEventSink(originalListener, eventProcessor)
{
	this.OriginalListener = originalListener;
	this.EventProcessor = eventProcessor;
}

HttpFoxEventSink.prototype = 
{
	OriginalListener: null,
	EventProcessor: null,
  
	// nsIChannelEventSink
	asyncOnChannelRedirect: function(aOldChannel, aNewChannel, aFlags, callback)
	{
		dump("-> asyncOnChannelRedirect (flags: " + aFlags + ")\n");
		
		if (HFU.isHttpChannel(aOldChannel)) 
		{ 
			// process
			this.EventProcessor.onAsyncChannelRedirect(aOldChannel, aNewChannel, aFlags, callback);
		}
		
		if (this.OriginalListener)
		{
			// forward
			try 
			{
				this.OriginalListener
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIChannelEventSink)
					.asyncOnChannelRedirect(aOldChannel, aNewChannel, aFlags, callback);
			}
			catch(e)
			{
				 /* OriginalListener does not support this interface */
			}
		}
	},

	onChannelRedirect: function (aOldChannel, aNewChannel, aFlags) 
	{
		dump("-> onChannelRedirect (flags: " + aFlags + ")\n");

		if (this.OriginalListener)
		{
			try 
			{
				// forward
				this.OriginalListener
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIChannelEventSink)
					.onChannelRedirect(aOldChannel, aNewChannel, aFlags);
			}
			catch(e)
			{
				 /* OriginalListener does not support this interface */
			}
		}
	},
 
	onProgress: function (aRequest, aContext, aProgress, aProgressMax) 
	{ 
		if (HFU.isHttpChannel(aRequest)) 
		{ 
			// process
			this.EventProcessor.onEventSinkProgress(aRequest, aProgress, aProgressMax); 
		}

		if (this.OriginalListener)
		{
			try 
			{
				// forward
				this.OriginalListener
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIProgressEventSink)
					.onProgress(aRequest, aContext, aProgress, aProgressMax);
			}
			catch(e) 
			{
				/* OriginalListener does not support this interface */
			}
		}
	},
	
	onStatus : function (aRequest, aContext, aStatus, aStatusArg) 
	{
		if (HFU.isHttpChannel(aRequest)) 
		{ 
			this.EventProcessor.onEventSinkStatus(aRequest, aStatus, aStatusArg); 
		}

		if (this.OriginalListener)
		{
			try 
			{
				// forward
				this.OriginalListener
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIProgressEventSink)
					.onStatus(aRequest, aContext, aStatus, aStatusArg);
			}
			catch(e)
			{
				 /* OriginalListener does not support this interface */
			}
		}
	},
 
	getInterface: function(iid) 
	{
		if (iid.equals(Ci.nsIProgressEventSink) || 
			iid.equals(Ci.nsIChannelEventSink))
		{
			return this;
		}
		
		if (this.OriginalListener)
		{
			return this.OriginalListener
				.QueryInterface(Ci.nsIInterfaceRequestor)
				.getInterface(iid);
		}
		else 
		{
			Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
			return null;
		}
	},

	QueryInterface: function(iid) 
	{
		if (iid.equals(Ci.nsIInterfaceRequestor) ||
			iid.equals(Ci.nsISupports))
		{
			return this;
		}
			
		Components.returnCode = Components.results.NS_ERROR_NO_INTERFACE;
		return null;
	}
};