	/*
	 * Phone component
	 */
	(function() {
		if ( !window.phone )
			return;

		_win.load(function() {
			var	GET_STATUS_DELAY = 1300;
	
			var applethandle = null;
	
			// Add applet element
			var attr = [],
				param = [],
				i;
	
			for (i in phone.attributes)
				if ( phone.attributes.hasOwnProperty(i) )
					attr.push(i + "=\"" + phone.attributes[i] + "\"");
	
			for (i in phone.parameters)
				param.push("<param name='" + i + "' value='" + phone.parameters[i] + "'/>");
	
			$('<div/>')
				.html('<applet ' + attr.join(' ') + '>' + param.join('') + '</applet>')
				.appendTo('body');

			function initcheck() { // piece of shit from muzi!
				if (applethandle === null) {
					try {
						applethandle =  document.getElementById('webphone');
					} catch (e) { }
			
					if (applethandle === null) {
						var applets = null;
						try{
							applets = document.applets;

							if (applets.length === 0) {
								applets = document.getElementsByTagName("object");
							}
							if (applets.length === 0) {
								applets = document.getElementsByTagName("applet");
							}

							for (var i = 0; i < applets.length; ++i) {
								try {
									if (typeof (applets[i].API_Call) != "undefined") {
										applethandle = applets[i];
										break;
									}
								} catch (e) { }
							}
						} catch (e) { }

						if (applethandle === null) {
							try{
								applethandle = document.applets[0];
							} catch (e) { }
						}
					}
			
					if (applethandle !== null) {
						try {
							var newapplethandle = applethandle.getSubApplet();
							if( newapplethandle !== null)
								applethandle  = newapplethandle;
						} catch (e) { }
					}
				}
			}

			initcheck();

			var	_phone = $('.js-phone'),
				_phoneButton = $('.js-phone-button'),
				_phoneStatus = $('.js-phone-status'),
				classOn = _phoneStatus.data('on'),
				classOff = _phoneStatus.data('off'),
				textOn = _phoneStatus.data('texton'),
				textOff = _phoneStatus.data('textoff'),
				offList = ['Ready', 'Register…', 'Registering…', 'Register Failed'];

			_phoneButton.on('status', function(e, status) {
				_phoneButton
					.toggleClass('is-standby', status == 'standby')
					.toggleClass('is-pickup', status == 'pickup')
					.toggleClass('is-hangup', status == 'hangup');
			});

			_phoneStatus.on('status', function(e, status) {
				var isOff = $.inArray(status, offList) !== -1;
				_phoneStatus
					.toggleClass(classOn, !isOff)
					.toggleClass(classOff, isOff)
					.text(isOff ? textOff : textOn);
			});

			setInterval(function() {
				if ( !applethandle )
					return initcheck();
	
				var	phoneStatus = applethandle.API_GetStatus(-2);
				phoneStatus = $.trim(phoneStatus);
				_phoneStatus.trigger('status', phoneStatus);

				/* Status set:
					Ready
					Register…
					Registering…
					Register Failed
					Registered
					Accept
					Starting Call
					Call
					Call Initiated
					Calling…
					Ringing…
					Incoming…
					In Call (xxx sec)
					Hangup
					Call Finished
					Chat
				 */
				switch(phoneStatus) {
					case 'Incoming...':
						_phoneButton
							.trigger('status', 'pickup')
							.off('.phone')
							.one('click.phone', function() {
								applethandle.API_Accept( applethandle.API_GetLine() );
								return false;
							});
					break;
					case 'Registered.':
						_phoneButton.trigger('status', 'standby');
					break;
					case 'Call Finished':
						_phoneButton.trigger('status', 'standby');
					break;
					default:
						if ( phoneStatus.indexOf('Speaking') !== -1 || phoneStatus.indexOf('In Call') !== -1 )
							_phoneButton
								.trigger('status', 'hangup')
								.off('.phone')
								.one('click.phone', function() {
									applethandle.API_Hangup( applethandle.API_GetLine() );
									return false;
								});
						else {
							_phoneButton.trigger('status', 'standby');
						}
					break;
				}
	
			}, GET_STATUS_DELAY);
		});
	})();