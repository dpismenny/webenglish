(function(soundManager) {
	if ( !soundManager || !$('.js-player').length )
		return;

	// Setup options
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

	// Init players for all views
	_win.on('sm2ready', function() {
		$('.js-player').each(function() {
			var	_this = $(this),
				_time = $('.js-player-time', _this),
				_playpause = $('.js-playpause', _this),
				_bar = $('.js-bar', _this),
				isPause = _playpause.data('pause'),
				isPlay = _playpause.data('play'),
				url = _this.data('url');

			_this
				.on('error', function() {
					_this.addClass('is-hold');
				})
				.on('time', function(e, ms) {
					_time.html('-' + timeFormatter(ms, true));
				})
				.on('bar', function(e, sound) {
					var	width = (sound.position / sound.duration) * 100;
					width = width.toFixed(2);
					_bar.width(width + '%');
				})
				.on('play_state', function() {
					_playpause
						.removeClass(isPlay)
						.addClass(isPause);
				})
				.on('pause_state', function() {
					_playpause
						.removeClass(isPause)
						.addClass(isPlay);
				});

			var sound = soundManager.createSound({
				url: url,
				autoLoad: false,
				autoPlay: false,
				onload: function() {
					if ( !this.loaded )
						return _this.trigger('error');

					_this.trigger('time', this.duration);
					_playpause.click($.proxy(function() {
						if ( this.paused || this.position === 0 )
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
				onfinish: function() {
					this.setPosition(0);
					_this
						.trigger('pause_state')
						.trigger('time', this.duration)
						.trigger('bar', this);
				},
				whileplaying: function() {
					_this
						.trigger('time', this.duration - this.position)
						.trigger('bar', this);
				},
				volume: 100
			});

			_playpause.one('click', function() {
				sound.load();
			});
		});
	});

})(window.soundManager);