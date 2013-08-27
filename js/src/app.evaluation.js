	/*
	 * Evaluation component
	 */
	(function() {
		if ( !$('#tpl_evaluation_info').length )
			return;

		var	template = $('#tpl_evaluation_info').html();
		template = _.template(template);
		
		$('.js-evaluation').each(function() {
			var	_this = $(this),
				_info = null,
				data = _this.data();

			_this.click(function() {
				if ( _info )
					return _info.slideToggle();

				//$.ajax(data.url, )
				_info = $(template({ dialogs: [] }));
				_info
					.insertAfter(_this)
					.slideDown();
			});
		});
	})();