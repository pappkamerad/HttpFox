// tree implementation for request/response output on main window
function HttpFoxTree(treeElement, httpFoxControllerReference)
{
	Cu["import"]("resource://httpfox/Utils.jsm");
	Cu["import"]("resource://httpfox/HttpFoxDataHelper.jsm");
	
	this.HttpFox = httpFoxControllerReference;
	this.TreeElement = treeElement;
	this.TreeElement.view = this;
}

HttpFoxTree.prototype = 
{
	HttpFox: null,
	TreeElement: null,
	selection: null,
	
	getCellText: function(row, column) 
	{
		var request = this.HttpFox.FilteredRequests[row];
		
		if (request)
		{
			// in deer park, the column is actually a tree column, rather than an id
			if (column.id)
			{
				column = column.id;
			}
			
	     	switch(column)
	     	{
	     		case "hf_Column_Started":
					return HFU.formatDateTime(request.StartTimestamp);
	        		return formatTime(new Date(request.StartTimestamp - this.HttpFox.HttpFoxService.StartTime.getTime()));
	        		
				case "hf_Column_Time":
					if (!request.IsComplete)
					{
						return "*";
					}

					return request.Duration;
					return formatTimeDifference(request.StartTimestamp, request.EndTimestamp);
					
				case "hf_Column_Sent":
					return "";
					var rString = "";
					
					if (request.IsSending)
					{
						rString = humanizeSize(request.getBytesSent(), 6) + "/" + humanizeSize(request.getBytesSentTotal(), 6);
					}
					else
					{
						rString = humanizeSize(request.getBytesSentTotal(), 6);	
					}
					
					return rString;
					
				case "hf_Column_Received":
					return request.ResponseSize;
					var rString = "";
					
					/*if (request.IsAborted)
					{
						return rString;
					}*/
					
					if (request.IsSending)
					{
						return "*";
					}
					
					if (!request.IsFinished)
					{
						// show loading body progress
						rString = humanizeSize(request.getBytesLoaded(), 6) + "/" + humanizeSize(request.getBytesLoadedTotal(), 6);
					}
					else
					{
						rString = humanizeSize(request.getBytesLoaded(), 6);	
					}
					
					if (request.IsFromCache || request.ResponseStatus == 304)
					{
						rString = "(" + rString + ")";
					}
					
					return rString;
					
				case "hf_Column_Method":
					return request.RequestMethod;
					
				case "hf_Column_Result":
					//return request.ResponseStatus;

					if (request.IsAborted)
					{
						return "(Aborted)";
					}
					
					if (request.isError())
					{
						return "(Error)";
					}
				
					if (request.IsFromCache && (request.ResponseStatus != 304))
					{
						return "(Cache)";
					}
					
//					if (!request.HasReceivedResponseHeaders && !request.IsFinal)
//					{
//						return "*";
//					}	
						
					return request.ResponseStatus;
					
				case "hf_Column_Type":
					//return request.ContentType;

					if (request.hasErrorCode())
					{
						if (request.ContentType)
						{
							return request.ContentType + " (" + HttpFoxNsResultErrorStrings[request.Status.toString(16).toUpperCase()] + ")";
						}
						
						return HttpFoxNsResultErrorStrings[request.Status.toString(16).toUpperCase()];
					}
					
					if (!request.HasReceivedResponseHeaders && !request.IsFromCache && !request.IsComplete)
					{
						return "*";
					}
					
					if (request.isRedirect())
					{
						if (request.ResponseHeaders && request.ResponseHeaders["Location"])
						{
							return "Redirect to: " + request.ResponseHeaders["Location"];	
						}
						return "Redirect (cached)";
					}
					
					return request.ContentType;
					
				case "hf_Column_URL":
					return request.Url;
					
				default:
					return "bad column: " + column;
			}
		}
		else
		{
			return "Bad row: " + row;
		}
	},

	setTree: function(treebox)
	{ 
		this.treebox = treebox; 
	},
	isContainer: function(row) 
	{
		return false; 
	},
	isSeparator: function(row) 
	{ 
		return false; 
	},
	isSorted: function(row) 
	{ 
		return false; 
	},
	getLevel: function(row)
	{ 
		return 0; 
	},
	getImageSrc: function(row, col)
	{ 
		return null; 
	},
	
	getRowProperties: function(row, props) 
	{
		//return;
		// apply different styles for request rows

		var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
		var request = this.HttpFox.FilteredRequests[row];
		
		if (this.TreeElement.view.selection.isSelected(row)) 
		{
			return;
		}
		
		if (!this.HttpFox.HttpFoxService.Preferences.ColorRequests)
		{
			return;
		}

		if (this.TreeElement.currentIndex == row)
		{
			props.AppendElement(aserv.getAtom("hf_currentRow"));
		}
				
		if (request.isHTTPS()) 
		{
			props.AppendElement(aserv.getAtom("hf_HTTPS"));
		}
		
		if (request.IsFromCache || request.ResponseStatus == 304)
		{
			props.AppendElement(aserv.getAtom("hf_fromCache"));
			return;
		}
		
		if (request.isRedirect()) 
		{
			props.AppendElement(aserv.getAtom("hf_isRedirect"));
			return;
		}
		
		if (request.isError())
		{
			props.AppendElement(aserv.getAtom("hf_isError"));
			return;
		}
		
		if (request.hasErrorCode() || request.ResponseStatus >= 400) 
		{
			props.AppendElement(aserv.getAtom("hf_hasError"));
			return;
		}
		
		if (request.IsFinished && request.ResponseStatus == 200) 
		{
			props.AppendElement(aserv.getAtom("hf_OK"));
		}
	},
	
	getCellProperties: function(row, col, props)
	{
		//return;
		// apply different styles for request rows

		var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
		var request = this.HttpFox.FilteredRequests[row];
		
		if (this.TreeElement.view.selection.isSelected(row)) 
		{
			return;
		}
		
		if (!this.HttpFox.HttpFoxService.Preferences.ColorRequests)
		{
			return;
		}
		
		if (request.IsFromCache) 
		{
			props.AppendElement(aserv.getAtom("hf_fromCache"));
		}
		
		if (request.isError()) 
		{
			props.AppendElement(aserv.getAtom("hf_isError"));
			return;
		}
		
		if (request.isHTTPS()) 
		{
			props.AppendElement(aserv.getAtom("hf_HTTPS"));
		}
	},

	getColumnProperties: function(colid, col, props)
	{
	},

	rowCountChanged: function(index, count) 
	{
		if (this.treebox) 
		{
			var lvr = this.treebox.getLastVisibleRow();
			this.treebox.rowCountChanged(index, count);
			// If the last line of the tree is visible on screen, we will autoscroll
			//if ((lvr + 1) >= index || this.HttpFox.isAutoScroll())
			if (this.HttpFox.isAutoScroll())
			{
				this.treebox.ensureRowIsVisible(this.rowCount - 1);
			}
		}
		if (this.rowCount > 0) 
		{
			//this.gui.hasVisibleData = true;
		} 
		else 
		{
			//this.gui.hasVisibleData = false;
		}
	},

	invalidateRow: function(index) 
	{
		if (this.treebox) 
		{
			this.treebox.invalidateRow(index);
		}
	},
	
	invalidate: function()
	{
		this.treebox.invalidate();
	},

	getCurrent: function() 
	{
		if (this.HttpFox.FilteredRequests[this.TreeElement.currentIndex]) 
		{
			return this.HttpFox.FilteredRequests[this.TreeElement.currentIndex];
		} 
		else
		{
			return null;
		}
	},
	
	setCurrent: function(index)
	{
		this.TreeElement.currentIndex = index;
		this.invalidate();
	},
	
	setCurrentToNewest: function()
	{
		this.TreeElement.currentIndex = this.rowCount;
		this.invalidate();
	},

	get rowCount()
	{
		return this.HttpFox.FilteredRequests.length;
		//return this.HttpFox.Requests.length;
	}

	/*set data(httpdata) {
		var oldCount = this.rowCount;
		this.sourceData = httpdata;
		//this.filteredData = this.sourceData.requests;
		// hook into the push function of the array
		this.sourceData.tree = this;
		this.sourceData.oldPush = this.sourceData.push;
		this.sourceData.push = myPush;
		//this.filteredData = this.sourceData.requests;
		this.rowCountChanged(0, -oldCount);
		//this.gui.hasData = (this.sourceData.requests.length > 0);
		//this.filter(this.gui.currentFilter);
	},*/ 

   /*getText : function(all) {
      var text = "";
      var start = 0;
      var end = 0;
      if (all) {
         end = this.filteredData.length;
         for (var current = start; current < end; current++) {
            if (current > start) {
               text += "\n";
            }
            text += this.filteredData[current].toString() + "\n";
         }
      } else {
         // do some tricky stuff here to retrieve all of the
         // selected rows
         var rangeStart = new Object();
         var rangeEnd = new Object();
         var numRanges = this.tree.view.selection.getRangeCount();
         
         for (var t = 0; t < numRanges; t++){
            this.tree.view.selection.getRangeAt(t , rangeStart, rangeEnd);
            for (var v = rangeStart.value; v <= rangeEnd.value; v++){
               // now we've got the index ...
               if (t != 0 || v != 0) {
                  text += "\n";
               }
               text += this.filteredData[v].toString() + "\n";
            }
         }
      }
      return text;
   },*/

  /* filter : function(value) {
      var oldRowCount = this.rowCount;
      if (value == null || value == "") {
         this.filteredData = this.sourceData.requests;
      } else {
         value = value.toLowerCase();
         this.filteredData = new Array();
         var request = null;
         for (var i = 0; i < this.sourceData.requests.length; i++) {
            request = this.sourceData.requests[i];
            if (request.uri.toLowerCase().indexOf(value) >= 0) {
            // make it a preference to filter on uri v.s. whole string
            // if (request.toString().toLowerCase().indexOf(value) >= 0) {
               this.filteredData.push(request);
            }
         }
      }
      if (this.treebox) {
         this.treebox.invalidate();
         this.rowCountChanged(0, this.rowCount - oldRowCount);
      }
   }*/
     
}