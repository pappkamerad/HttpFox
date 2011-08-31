var EXPORTED_SYMBOLS = [
	"HttpFoxRequestStore"
];

// standard shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

function HttpFoxRequestStore(service)
{
	Cu["import"]("resource://httpfox/Utils.jsm");
	Cu["import"]("resource://httpfox/HttpFoxRequest.jsm");
	this.Service = service;
};

HttpFoxRequestStore.prototype =
{
	// Properties
	Service: null,
	Requests: new Array(), // All requests (holds HttpFoxRequest objects)
	PendingRequests: new Array(), // Only the pending requests (holds HttpFoxRequest objects)
	IntervalChecker: null,

	clearRequests: function()
	{
		this.Requests = new Array();
		this.PendingRequests = new Array();
	},

	isNewRequest: function(httpChannel)
	{
		return (this.getMatchingRequestIndex(httpChannel) == -1) ? true : false;
	},

	getMatchingRequest: function(httpChannel)
	{
		// check for matching pending request
		var i = this.getMatchingRequestIndex(httpChannel);
		return (i == -1) ? null : this.PendingRequests[i];
	},

	getMatchingRequestIndex: function(httpChannel)
	{
		// check for matching request
		for (var i = 0; i < this.PendingRequests.length; i++) 
		{
			if (httpChannel === this.PendingRequests[i].HttpChannel) 
			{
				return i;
			}
		}
		
		// no match found
		return -1;
	},

	addNewRequest: function(request)
	{
		// a new request
		this.Requests.push(request);
		this.PendingRequests.push(request);

		// start checking
		if (this.IntervalChecker == null)
		{
			this.IntervalChecker = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
			var callback = 
			{
				notify: function(timer) 
				{
					this.parent.checkPendingRequests();
					return;
				}
			};
			callback.parent = this;
			this.IntervalChecker.initWithCallback(callback, 100, Ci.nsITimer.TYPE_REPEATING_SLACK);
		}
	},

	removeRequestFromPendingRequests: function(request)
	{
		// remove from PendingRequests
		var i = this.getMatchingRequestIndex(request.HttpChannel);
		if (i != -1)
		{
			this.PendingRequests.splice(i, 1);
		}
	},

	checkPendingRequests: function()
	{
		try 
		{
			for (var i = 0; i < this.PendingRequests.length; i++)
			{
				//dump("+ checking pending: " + i + "/" + this.PendingRequests.length + "\n");
				var pendingRequest = this.PendingRequests[i];
				if (pendingRequest.HttpChannel && 
					!pendingRequest.HttpChannel.isPending() && 
					pendingRequest.HttpChannel.status == 2152398850)
				{
					// request aborted. complete request. 
					pendingRequest.AddLog("scanned aborted / complete: " + pendingRequest.HttpChannel.status);
					//dump("Manually SetComplete: " + pr.HttpChannel.status + "\n");
					
					pendingRequest.setAborted(HFU.now());
					
					// check if complete
					pendingRequest.finishIfReady();

					// adapt array
					i--;
				}
			}
			
			if (this.PendingRequests.length == 0) 
			{
				if (this.IntervalChecker != null)
				{
					this.IntervalChecker.cancel();
					this.IntervalChecker = null;
				}
			}
		}
		catch(e) 
		{
			dump("EXC while checking pending requests: " + e + "\n");
		}
	}
};