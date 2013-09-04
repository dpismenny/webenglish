	/*
	 * Player component
	 */
	(function(soundManager) {
		if ( !soundManager )
			return;

		// Setup SM2 options
		_win.one('sm2_init', function() {
			soundManager.setup({
				url: '/js/soundmanager2/swf/',
				preferFlash: false,
				onready: function() {
					_win.trigger('sm2_ready');
				},
				ontimeout: function() {
					throw new Error('SoundManager2 init error');
				}
			});
		});

		/**
		 * jsplayer - jQuery-plugin for SM2 player
		 * @class jsplayer
		 * @memberOf jQuery.fn
		 * @param {Object} [opts] Player options
		 * @param {String} [opts.url] Sound file URL
		 * @param {Number} [opts.volume] Sound volume [0..100], default - 100 
		 * @param {Boolean} [opts.autoplay] Auto play mode, default - false
		 * @param {Boolean} [opts.autoload] Auto load sound file, default - false
		 * @param {Boolean} [opts.onlyback] Only backward set position, default - false
		 * @param {String} [opts.classPause] Class for pause-mode of control
		 * @param {String} [opts.classPlay] Class for play-mode of control
		 * @fires jsplayer#event:do_init
		 * @fires jsplayer#event:do_stop
		 * @fires jsplayer#event:error File loading error
		 * @fires jsplayer#event:time Remaining time changes
		 * @fires jsplayer#event:bar Progress bar position changes
		 * @fires jsplayer#event:play_state Play state for player control
		 * @fires jsplayer#event:pause_state Pause state for player control
		 */
		$.fn.jsplayer = function(opts) {
			opts = opts || {};

			return $(this).each(function() {
				var	_this = $(this),
					_time = $('.js-player-time', _this),
					_playpause = $('.js-playpause', _this),
					_bar = $('.js-bar', _this),
					_notch = $('.js-notch', _this),
					_track = _bar.parent(),
					url = _this.data('url') || opts.url,
					volume = _this.data('volume') || opts.volume || 100,
					autoplay = !!_this.data('autoplay') || opts.autoplay,
					autoload = !!_this.data('autoload') || opts.autoload,
					onlyback = !!_this.data('onlyback') || opts.onlyback,
					classPause = _playpause.data('pause') || opts.classPause,
					classPlay = _playpause.data('play') || opts.classPlay;

				if ( _this.data('jsplayer_added') )
					return false;

				_this
					// Init player, call sound.load() or sound.play()
					.on('do_init', function() {
						if ( sound.position > 0 )
							return;
						else if ( sound.loaded )
							sound.play();
						else
							sound.load();
						_playpause.off('.init');
					})
					// Call sound.stop()
					.on('do_stop', function() {
						sound.stop();
						_notch.hide();
					})
					// File load error
					.on('error', function() {
						_this.addClass('is-hold');
						_win.trigger('create_popup', { message: 'Error – audio file was not loaded' });
					})
					// Set remaining time
					.on('time', function(e, opts) {
						_time.html((opts.positive ? '' : '-') + timeFormatter(opts.ms, true));
					})
					// Set bar position
					.on('bar', function() {
						var	width = (sound.position / sound.duration) * 100;
						width = width.toFixed(2);
						_bar.width(width + '%');
					})
					.on('notch', function() {
						var left = sound.maxPosition / sound.duration;
						if ( left === 1 )
							return;
						left *= 100;
						left = left.toFixed(2);
						_notch
							.show()
							.css('left', left + '%');
						_this.
							on('bar.notch', function() {
								if ( sound.position < sound.maxPosition )
									return;
								_notch.hide();
								_this.off('.notch');
							});
					})
					// Set play state for player control
					.on('play_state', function() {
						_playpause
							.removeClass(classPlay)
							.addClass(classPause);
					})
					// Set pause state for player control
					.on('pause_state', function() {
						_playpause
							.removeClass(classPause)
							.addClass(classPlay);
					})
					.data('jsplayer_added', true);

				// Bar click handler, change track current position
				_track
					.click(function(e) {
						if ( $(e.target).closest('.js-notch').length )
							return;

						if ( !sound.loaded || !sound.duration )
							return;

						var	position = (e.offsetX || e.originalEvent.layerX || 0) / _track.width();
						position *= sound.duration;

						if ( onlyback ) {
							if ( position > sound.maxPosition )
								return;
							else
								_this.trigger('notch');
						}

						sound.setPosition(position);
						_this
							.trigger('time', { ms: sound.duration - sound.position })
							.trigger('bar');
					});

				// Sound instance
				var sound = soundManager.createSound({
					url: url,
					autoLoad: autoload,
					autoPlay: autoplay,
					onload: function() {
						if ( !this.loaded )
							return _this.trigger('error');

						_this.trigger('time', { ms: this.duration });
						_playpause
							.off()
							.click($.proxy(function() {
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
							.trigger('time', { ms: this.duration, positive: true })
							.trigger('bar');
					},
					onfinish: function() {
						_this
							.trigger('finish')
							.trigger('pause_state')
							.trigger('time', { ms: this.duration, positive: true })
							.trigger('bar');
					},
					whileplaying: function() {
						this.maxPosition = Math.max(this.maxPosition || 0, this.position);
						_this
							.trigger('time', { ms: this.duration - this.position })
							.trigger('bar');
					},
					volume: 100
				});

				_playpause.one('click.init', function() {
					_this.trigger('do_init');
				});
			});
		};

		// Init players for all views
		_win.one('sm2_ready', function() {
			$('.js-player').jsplayer({ test: true });
		});

		// Auto init for detected players
		if ( $('.js-player').length )
			_win.trigger('sm2_init');

	})(window.soundManager);