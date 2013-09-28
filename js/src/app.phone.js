	/*
	 * Phone component
	 */
	(function() {
		if ( !window.phone )
			return;

		// Detect Java
		if ( window.deployJava ) {
			var JREs = deployJava.getJREs();
			if ( !JREs || !JREs.length )
				_win.trigger('create_popup', { message: 'You need to <a target="_blank" href="http://www.java.com/getjava">install Java</a>, to be able to take calls from customers', timeout: 0 });
		}

		// Hide embed#deployJavaPlugin (FF fix)
		$('#deployJavaPlugin').hide();

		var	GET_STATUS_DELAY = 200,
			ANIMATE_DURATION = 500,
			DEFAULT_FAIL_DELAY =10 * 1000;

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
			_phoneButtonStanby = $('[data-stanby]', _phoneButton),
			_phoneStatus = $('.js-phone-status'),
			_phoneFail =$('.js-phonefail'),
			failTimer = null,
			failDelay = _phoneFail.data('delay'),
			classOn = _phoneStatus.data('on'),
			classOff = _phoneStatus.data('off'),
			classWait = _phoneStatus.data('wait'),
			textOn = _phoneStatus.data('texton'),
			textOff = _phoneStatus.data('textoff'),
			textWait = _phoneStatus.data('textwait'),
			waitList = ['Ready', 'Register…', 'Registering…'],
			offList = ['Register Failed'],
			pickupAnimate = true,
			globalStatus = '';

		failDelay = parseInt(failDelay, 10);
		failDelay = failDelay ? failDelay * 1000 : DEFAULT_FAIL_DELAY;

		_phoneButton
			.on('growup', function() {
				_phoneButton.animate({
					transform: 'scale(1.1)'
				}, ANIMATE_DURATION, 'swing', function() {
					_phoneButton.trigger('growdown');
				});
			})
			.on('growdown', function() {
				_phoneButton.stop().animate({
					transform: 'scale(0.9)'
				}, ANIMATE_DURATION, function() {
					_phoneButton.trigger('growup');
				});
			})
			.on('status', function(e, status) {
				if ( status != globalStatus ) {
					globalStatus = status;
					_win.trigger('phone_status', globalStatus);
				}

				_phoneButton
					.toggleClass('is-standby', status == 'standby')
					.toggleClass('is-pickup', status == 'pickup')
					.toggleClass('is-hangup', status == 'hangup');
	
				if ( status == 'pickup' ) { // pick up animation, required jquery.transform.js
					if ( !pickupAnimate )
						return;
					pickupAnimate = false;
					_phoneButton
						.stop()
						.trigger('growup');
				} else {
					pickupAnimate = true;
					_phoneButton
						.stop()
						.css('transform', 'scale(1)');
				}
			});

		_phoneStatus.on('status', function(e, status) {
			var isOff, isOn, isWait;
			if ( $.inArray(status, offList) !== -1 )
				isOff = true;
			else if ( $.inArray(status, waitList) !== -1 )
				isWait = true;
			else
				isOn = true;

			_phoneStatus
				.toggleClass(classOn, !!isOn)
				.toggleClass(classOff, !!isOff)
				.toggleClass(classWait, !!isWait)
				.text(isOff ? textOff : (isWait ? textWait : textOn));
		});

		failTimer = setTimeout(function() {
			_phoneFail.removeClass('is-hidden');
		}, failDelay);

		setInterval(function() {
			if ( !applethandle )
				return initcheck();

			var	phoneStatus;
			try {
				phoneStatus = applethandle.API_GetStatus(-2);
			} catch(e) {
				return initcheck();
			}

			phoneStatus = $.trim(phoneStatus);
			_phoneStatus.trigger('status', phoneStatus);
			_phone.trigger('inited');

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

		// Stay on this page popup && cancel fail timer
		_phone.one('inited', function() {
			clearTimeout(failTimer);
			failTimer = null;

			if ( _phoneButtonStanby.length )
				_phoneButtonStanby.text( _phoneButtonStanby.data('stanby') );

			_win.on('beforeunload', function() {
				return 'If you leave this page now, you will not be able to take calls, and you will lose your place in the queue.';
			});
		});
			
	})();