	/*
	 * Player component
	 */
	(function(soundManager) {
		if ( !soundManager )
			return;

		// Setup options 
		_win.one('sm2init', function() {
			soundManager.setup({
				url: '/js/soundmanager2/swf/',
				preferFlash: false,
				onready: function() {
					_win.trigger('sm2ready');
				},
				ontimeout: function() {
					// @todo
				}
			});
		});

		// jsplayer jQuery-plugin
		$.fn.jsplayer = function(opts) {
			return $(this).each(function() {
				var	_this = $(this),
					_time = $('.js-player-time', _this),
					_playpause = $('.js-playpause', _this),
					_bar = $('.js-bar', _this),
					_track = _bar.parent(),
					autoPlay = !!_this.data('autoplay'),
					isPause = _playpause.data('pause'),
					isPlay = _playpause.data('play'),
					url = _this.data('url');

				_this
					// Init player, fired load or play
					.on('init', function() {
						_playpause.off('.init');
						if ( sound.position > 0 )
							return;
						else if ( sound.loaded )
							sound.play();
						else
							sound.load();
					})
					// File load error
					.on('error', function() {
						_this.addClass('is-hold');
					})
					// Set remaining time
					.on('time', function(e, ms) {
						_time.html('-' + timeFormatter(ms, true));
					})
					// Set bar position
					.on('bar', function() {
						var	width = (sound.position / sound.duration) * 100;
						width = width.toFixed(2);
						_bar.width(width + '%');
					})
					// Set play state for player control
					.on('play_state', function() {
						_playpause
							.removeClass(isPlay)
							.addClass(isPause);
					})
					// Set pause state for player control
					.on('pause_state', function() {
						_playpause
							.removeClass(isPause)
							.addClass(isPlay);
					});

				// Bar click handler, change track current position
				_track
					.click(function(e) {
						if ( sound.loaded && sound.duration ) {
							var	position = (e.offsetX || e.originalEvent.layerX || 0) / _track.width();
							position *= sound.duration;
							sound.setPosition(position);
							_this
								.trigger('time', sound.duration - sound.position)
								.trigger('bar');
						}
					});

				// Sound instance
				var sound = soundManager.createSound({
					url: url,
					autoLoad: false,
					autoPlay: autoPlay,
					onload: function() {
						if ( !this.loaded )
							return _this.trigger('error');

						_this.trigger('time', this.duration);
						_playpause.click($.proxy(function() {
							if ( this.paused || this.playState === 0 )
								this.play();
							else
								this.pause();
						}, this));
						this.play();
					},
					onplay: function() {
						_this.trigger('play_state');
					},
					onresume: function() {
						_this.trigger('play_state');
					},
					onpause: function() {
						_this.trigger('pause_state');
					},
					onstop: function() {
						this.setPosition(0);
						_this
							.trigger('pause_state')
							.trigger('time', this.duration)
							.trigger('bar');
					},
					onfinish: function() {
						_this
							.trigger('finish')
							.trigger('pause_state')
							.trigger('time', this.duration)
							.trigger('bar');
					},
					whileplaying: function() {
						_this
							.trigger('time', this.duration - this.position)
							.trigger('bar');
					},
					volume: 100
				});

				_playpause.one('click.init', function() {
					_this.trigger('init');
				});

				_this.data('sound', sound);
			});
		};

		// Init players for all views
		_win.one('sm2ready', function() {
			$('.js-player').jsplayer({ test: true });
		});

		// Auto init for detected players
		if ( $('.js-player').length )
			_win.trigger('sm2init');

	})(window.soundManager);