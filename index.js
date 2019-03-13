/*
  This is an original work
  (c) Michael Malkiewicz
  All rights reserved
*/

'use strict';

window.onload = function() {
	// TODO: override these with html modals
	var modal = {
		alert : function(a) {
			return window.alert(a);
		},
		prompt : function(a, b) {
			return window.prompt(a, b);
		},
		confirm : function(a) {
			return window.confirm(a);
		},
	};

	document.getElementById('modal-close').onclick = function() {
		document.getElementById('modal').style.display = 'none';
	};

	var make_modal = function(text, button_text) {
		var m = document.getElementById('modal');
		var m_text = document.getElementById('modal-text');
		var m_close = document.getElementById('modal-close');
		m.style.display = 'block';
		m_text.innerHTML = text;
		m_close.innerHTML = button_text || 'Dismiss';
	};

	// lazy iteration
	var each = function(arr, f) {
		for (var i = 0; i < arr.length; ++i) {
			f(arr[i]);
		};
	};

	// sets .innerHTML to ''
	var remove_all_children = function(obj) {
		while (obj.firstChild) {
			obj.removeChild(obj.firstChild);
		}
	};

	// current term, could be 'fal', 'spr', or 'sum
	var term = 'fal';

	// api request
	var sendReq = function(course, callback) {
		var req = new XMLHttpRequest();
		if (callback) {
			req.addEventListener('load', callback);
		}
		req.open('GET', './soc.php?t=' + term + '&c=' + course);
		req.send();
	};

	// lazy iteration of all blocks in the schedule table
	var forall_schedule = function(f) {
		var days = [ 'M', 'T', 'W', 'R', 'F' ];
		each(days, function(day) {
			for (var i = 1; i <= 14; ++i) {
				f(document.getElementById(day + i.toString()));
			}
		});
	};

	// removes a course code from the schedule table
	var remove_from_schedule = function(course_name) {
		forall_schedule(function(o) {
			if (o.innerHTML == course_name) {
				remove_all_children(o);
			}
		});
	};

	// places a course code on the schedule table, checking
	// if anything is already in it's spot
	var put_on_schedule = function(section) {
		var conflict_with = null;
		each(section.meetStr, function(mw) {
			var other = document.getElementById(mw).innerHTML;
			if (other != '') {
				conflict_with = other;
			}
		});
		var cfl = document.getElementById('conflict-resolve');
		cfl.style.display = 'none';
		if (conflict_with) {
			remove_all_children(cfl);
			cfl.style.display = 'block';
			var op1 = document.createElement('a');
			op1.appendChild(document.createTextNode('Remove ' + conflict_with + '?'));
			op1.href = '#';
			op1.onclick = function() {
				remove_from_schedule(conflict_with);
				put_on_schedule(section);
			};
			cfl.appendChild(document.createTextNode('Schedule conflict : '));
			cfl.appendChild(op1);
		} else {
			each(section.meetStr, function(mw) {
				document.getElementById(mw).innerHTML = section.parent;
			});
		}
	};

	// object to hold all course codes that are loaded
	var all_classes = {};
	// holds the button and div html tags for the buttons
	// to the left
	var all_class_btn_div = {};
	// (string) the name of the last course to be clicked
	var last_selected = null;
	// holds all course names from course code
	var course_name = {};
	
	// puts all the section numbers out for the user
	var select_class = function(which) {
		var o = document.getElementById('section-select');
		remove_all_children(o);
		var sel = all_classes[which];
		var no_meets = true;
		for (var meetStr in sel) {
			no_meets = false;
			var el = document.createElement('a');
			el.href = '#';
			// this double closure is important, otherwise
			// `meetStr will hold it's value for all onclicks
			el.onclick = (function (x) {
				return function() {
					remove_from_schedule(x.parent);
					put_on_schedule(x);
				};
			})(sel[meetStr]);
			el.appendChild(document.createTextNode(meetStr));
			o.appendChild(el);
			var space = document.createElement('span');
			space.style.display = 'inline-block';
			space.style.width = '10px';
			o.appendChild(space);
		}
		document.getElementById('now-selecting').innerHTML = which + ' - ' + course_name[which];
		if (no_meets) {
			o.innerHTML = '(This class has no meet times)';
		}
		last_selected = which;
	};

	// helper function to translate the 'evening' class periods
	var get_period_num = function(n) {
		if (term == 'sum') {
			if (n == 'E1')
				return 8;
			else if (n == 'E2')
				return 9;
		} else {
			if (n == 'E1')
				return 12;
			else if (n == 'E2')
				return 13;
			else if (n == 'E3')
				return 14;
		}
		return parseInt(n, 10);
	};

	// the callback for the class request
	var class_onload = function() {
		var obj = null;
		try {
			obj = JSON.parse(this.responseText);
		} catch (e) {
			console.log(e);
			console.log(this.responseText);
			return;
		}
		if (obj == null) {
			console.log('JSON object came out null');
			return;
		}
		if (obj.error) {
			var message = '<p>' + obj.error.title + '</p>';
			message += '<p>' + obj.error.description + '</p>';
			make_modal(message, 'Oh well');
			return;
		}
		if (! obj[0].COURSES || obj[0].COURSES.length == 0) {
			make_modal('<p>Your search returned no results.</p>');
			return;
		}
		each(obj[0].COURSES, function(course) {
			course_name[course.code] = course.name;
			each(course.sections, function(section) {
				if (! (course.code in all_classes)) {
					all_classes[course.code] = {};
					var btn = document.createElement('button');
					btn.onclick = function() {
						select_class(course.code);
					};
					btn.appendChild(document.createTextNode(course.code));
					var btn_div = document.createElement('div');
					btn_div.appendChild(btn);
					document.getElementById('sidebar').appendChild(btn_div);
					all_class_btn_div[course.code] = btn_div;
				}
				var meetStr = '';
				section.meetStr = [];
				section.parent = course.code;
				each(section.meetTimes, function(meet) {
					var begin = get_period_num(meet.meetPeriodBegin);
					var end = get_period_num(meet.meetPeriodEnd);
					for (var i = begin; i <= end; ++i) {
						each(meet.meetDays, function(day) {
							var s = day + i.toString();
							meetStr += s;
							section.meetStr.push(s);
						});
					}
				});
				if (! (meetStr in all_classes[course.code]) && meetStr.length > 0) {
					all_classes[course.code][meetStr] = section;
				}
			});
		});
	};

	document.getElementById('btn-clear').onclick = function() {
		if (modal.confirm('Are you sure you want to wipe the schedule?')) {
			forall_schedule(function(o) {
				remove_all_children(o);
			});
		}
	};

	document.getElementById('btn-remove').onclick = function() {
		if (last_selected == null)
			return;
		remove_from_schedule(last_selected);
	}

	var course_cancel = function(which) {
		remove_from_schedule(which);
		document.getElementById('sidebar').removeChild(all_class_btn_div[which]);
		delete all_class_btn_div[which];
		delete all_classes[which];
		remove_all_children(document.getElementById('now-selecting'));
		remove_all_children(document.getElementById('section-select'));
		remove_all_children(document.getElementById('conflict-resolve'));
	};

	var course_cancel_all = function() {
		forall_schedule(function(o) {
			remove_all_children(o);
		});
		var o = document.getElementById('sidebar');
		// if we are going to set innerHTML anyway why bother removing
		// all of the children ? who knows maybe it's faster
		remove_all_children(o);
		o.innerHTML = '&nbsp;'
		all_class_btn_div = {};
		all_classes = {};
		remove_all_children(document.getElementById('now-selecting'));
		remove_all_children(document.getElementById('section-select'));
		remove_all_children(document.getElementById('conflict-resolve'));
	};


	document.getElementById('btn-cancel').onclick = function() {
		if (last_selected == null) {
			return;
		}
		course_cancel(last_selected);
		last_selected = null;
	};

	document.getElementById('btn-cancel-all').onclick = function() {
		if (modal.confirm('Are you sure you want to remove everything (including your course list)?')) {
			course_cancel_all();
		}
	}

	document.getElementById('btn-search').onclick = function() {
		var res = modal.prompt('Type course code to search (eg. cop3530)', '');
		if (res != null && res.length > 1) {
			sendReq(res, class_onload);
		}
	};

	(function (obj) {
		var old_value = term;
		obj.onchange = function() {
			old_value = term;
			term = this.value;
			// check if there are classes loaded
			var empty = true;
			for (var k in all_classes) {
				empty = false;
				break;
			}
			if (empty) {
				return;
			}
			if (modal.confirm('You are switching the term with courses still loaded from the previous term. This will clear all of your loaded classes.')) {
				course_cancel_all();
			} else {
				term = old_value;
				this.value = old_value;
			}
		};
		obj.onchange();
	})(document.getElementById('term-select'));

	if (window.innerWidth / window.innerHeight < 0.75) {
		make_modal('<p>I see you are using this page on mobile.</p><p>You will probably want to turn the screen to LANDSCAPE, otherwise everything will look dumb.</p>', 'Sure why not');
	}
};
