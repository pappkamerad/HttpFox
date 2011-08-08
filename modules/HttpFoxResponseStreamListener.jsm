var EXPORTED_SYMBOLS = [
	"HttpFoxResponseStreamListener"
];

// standard shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

function HttpFoxResponseStreamListener(eventProcessor)
{
	this.EventProcessor = eventProcessor;
};

HttpFoxResponseStreamListener.prototype =
{
	// Properties
	OriginalListener: null,
	Request: null,
	EventProcessor: null,
		
	// nsIStreamListener
    onDataAvailable: function(request, context, inputStream, offset, count) 
    {
		//request.QueryInterface(Ci.nsIHttpChannel);
		var outStream = this.EventProcessor.onResponseDataAvailable(this.Request, context, inputStream, offset, count);

		//this.Request.AddLog("Data: " + data);
		//dump("Data: " + data + "\n");

		// forward to original listener
        this.OriginalListener.onDataAvailable(request, context, outStream.newInputStream(0), offset, count);
	},

	onStartRequest: function(request, context)
	{
		this.EventProcessor.onResponseStart(this.Request, context);
		
		//dump("*** onStartRequest" + request.URI.asciiSpec + "\n");
		//dump("--* onStartRequest" + request.originalURI.asciiSpec + "\n");

		// forward to original listener
		try 
		{
			this.OriginalListener.onStartRequest(request, context);	
		}
		catch(e) 
		{
			//dump("startRequest forward to OriginalListener failed (" + e + ")\n");
			//dump("request status: (" + request.status + ")\n");
		}
		
	},

    onStopRequest: function(request, context, statusCode) 
    {
		// forward to original listener
		this.OriginalListener.onStopRequest(request, context, statusCode);

		this.EventProcessor.onResponseStop(this.Request, context, statusCode);
		
		//dump("*** onStopRequest (" + statusCode + ") " + request.URI.asciiSpec + "\n");
		//dump("\ncontent:\n" + this.HttpFoxRequest.ResponseData);
		
		
		//this.OriginalListener = null;
	},

    // nsISupports
	QueryInterface: function(iid) 
	{
		if (!iid.equals(Components.interfaces.nsISupports) &&
			!iid.equals(Components.interfaces.nsIStreamListener))
		{
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
        
        return this;
    }
};