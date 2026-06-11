/* 3615 DOLI — Minitel pour Dolibarr.
 * Modem synthétisé au WebAudio (il compose vraiment le 36 15 en DTMF),
 * texte au caractère par caractère, touches Minitel, tarification en francs.
 */
(function () {
	'use strict';

	var src = (document.currentScript && document.currentScript.src) || '';
	var ROOT = src.indexOf('/custom/') !== -1
		? src.split('/custom/')[0]
		: src.replace(/\/doli3615\/js\/doli3615\.js.*$/, '');

	var TOP = (window.self === window.top);
	var MODEM_MS = 6400;

	/* ------------------------------------------------------ audio ----- */

	var actx = null;

	function ac() {
		if (!actx) {
			var AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return null;
			actx = new AC();
		}
		if (actx.state === 'suspended') actx.resume();
		return actx;
	}

	function tone(freqs, t0, dur, vol, type) {
		var c = ac();
		if (!c) return;
		var g = c.createGain();
		var start = c.currentTime + t0;
		g.gain.setValueAtTime(0.0001, start);
		g.gain.linearRampToValueAtTime(vol, start + 0.01);
		g.gain.setValueAtTime(vol, start + Math.max(0.011, dur - 0.02));
		g.gain.linearRampToValueAtTime(0.0001, start + dur);
		g.connect(c.destination);
		freqs.forEach(function (f) {
			var o = c.createOscillator();
			o.type = type || 'sine';
			o.frequency.value = f;
			o.connect(g);
			o.start(start);
			o.stop(start + dur);
		});
	}

	function hiss(t0, dur, vol) {
		var c = ac();
		if (!c) return;
		var n = Math.floor(c.sampleRate * dur);
		var buf = c.createBuffer(1, n, c.sampleRate);
		var d = buf.getChannelData(0);
		for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
		var s = c.createBufferSource();
		s.buffer = buf;
		var g = c.createGain();
		g.gain.setValueAtTime(vol, c.currentTime + t0);
		g.gain.linearRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
		s.connect(g);
		g.connect(c.destination);
		s.start(c.currentTime + t0);
	}

	function soundOn() {
		return localStorage.getItem('d3615_mute') !== '1';
	}

	function keyBeep() {
		if (soundOn()) tone([1100], 0, 0.04, 0.08, 'square');
	}

	// Les navigateurs ne laissent sonner l'audio qu'après un geste de
	// l'utilisateur : on déverrouille le contexte au premier clic / touche.
	function unlock() {
		var c = ac();
		if (c && c.state === 'suspended') c.resume();
	}
	document.addEventListener('pointerdown', unlock, true);
	document.addEventListener('keydown', unlock, true);

	// Crachotis de réception de données pendant la peinture de l'écran
	var crackle = null;

	function startCrackle() {
		if (crackle || !soundOn()) return;
		var c = ac();
		if (!c || c.state !== 'running') return; // bloqué tant que pas de geste
		var n = Math.floor(c.sampleRate * 1.5);
		var buf = c.createBuffer(1, n, c.sampleRate);
		var d = buf.getChannelData(0);
		for (var i = 0; i < n; i++) {
			d[i] = Math.random() < 0.18 ? (Math.random() * 2 - 1) * (Math.random() < 0.04 ? 1 : 0.3) : 0;
		}
		var s = c.createBufferSource();
		s.buffer = buf;
		s.loop = true;
		var f = c.createBiquadFilter();
		f.type = 'bandpass';
		f.frequency.value = 1800;
		f.Q.value = 0.8;
		var g = c.createGain();
		g.gain.value = 0.07;
		s.connect(f);
		f.connect(g);
		g.connect(c.destination);
		s.start();
		crackle = { s: s, g: g, c: c };
	}

	function stopCrackle() {
		if (!crackle) return;
		var cr = crackle;
		crackle = null;
		cr.g.gain.linearRampToValueAtTime(0.0001, cr.c.currentTime + 0.15);
		setTimeout(function () { cr.s.stop(); }, 250);
	}

	function playModem() {
		if (!soundOn()) return;
		var c = ac();
		if (!c) return;
		var go = function () {
			// Décroché, tonalité France Télécom
			tone([440], 0.2, 0.9, 0.15);
			// Composition du 36 15 en DTMF
			var dtmf = { 3: [697, 1477], 6: [770, 1336], 1: [697, 1209], 5: [770, 1336] };
			[3, 6, 1, 5].forEach(function (k, i) {
				tone(dtmf[k], 1.35 + i * 0.22, 0.14, 0.2);
			});
			// Sonnerie
			tone([440], 2.5, 0.8, 0.1);
			// Tonalité de réponse du serveur
			tone([2100], 3.6, 0.6, 0.14);
			// Négociation porteuse V.23
			for (var i = 0; i < 4; i++) {
				tone([i % 2 ? 2100 : 1300], 4.3 + i * 0.17, 0.15, 0.1, 'square');
			}
			// Souffle de négociation
			hiss(4.95, 1.2, 0.09);
		};
		if (c.state === 'suspended') c.resume().then(go, function () {});
		else go();
	}

	/* ------------------------------------------------- typewriter ----- */

	function typeText(el, text, speed, done) {
		var i = 0;
		(function step() {
			if (i <= text.length) {
				el.textContent = text.slice(0, i++);
				setTimeout(step, speed);
			} else if (done) {
				done();
			}
		})();
	}

	/* ------------------------------- peinture de l'écran à 1200 bauds ----- */
	/* Les textes visibles à l'écran apparaissent caractère par caractère, en
	 * balayage raster : ligne par ligne, du haut vers le bas, comme un Minitel
	 * qui reçoit sa page. La vitesse d'écriture est constante quelle que soit
	 * la page ; ce qui est sous la ligne de flottaison est affiché direct (on
	 * ne le voit pas pendant l'animation, et c'est déjà peint quand on y
	 * descend), donc une page interminable ne bloque jamais plus qu'un écran.
	 * Les caractères non révélés sont masqués par des espaces insécables :
	 * même largeur en monospace, la mise en page ne bouge pas. */

	function paintScreen(delayMs) {
		var CPS = 300; // caractères écrits par seconde, constant
		var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, OPTION: 1, TITLE: 1, IFRAME: 1 };
		var vh = window.innerHeight;
		var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
		var nodes = [];
		var total = 0;
		var n;

		// 1) Lecture seule : collecte des textes et de leur position (un seul reflow)
		while ((n = walker.nextNode())) {
			var p = n.parentElement;
			if (!p || SKIP[p.tagName]) continue;
			if (p.closest('[id^="d3615-"]')) continue;
			if (!/\S/.test(n.data)) continue;
			var range = document.createRange();
			range.selectNodeContents(n);
			var r = range.getClientRects();
			if (!r.length) continue; // élément invisible
			if (r[0].top < -80 || r[0].top > vh + 80) continue; // hors écran : affiché direct
			nodes.push({ n: n, t: n.data, y: r[0].top, x: r[0].left });
			total += n.data.length;
			if (total > 60000) break; // garde-fou pour les pages monstrueuses
		}
		if (!nodes.length) return;

		// 2) Tri en balayage raster : du haut vers le bas, puis de gauche à droite
		nodes.sort(function (a, b) {
			var ya = Math.round(a.y / 12);
			var yb = Math.round(b.y / 12);
			return (ya - yb) || (a.x - b.x);
		});

		// 3) Écriture : on masque tout d'un coup
		nodes.forEach(function (o) {
			o.m = o.t.replace(/\S/g, '\u00A0'); // insecable : pas de repli des blancs
			o.n.data = o.m;
		});

		// 4) Balayage : vitesse constante, peu importe la densité de la page
		var budget = Math.max(1, Math.round(CPS / 60));
		var idx = 0;
		var off = 0;
		var caret = document.createElement('div');
		caret.id = 'd3615-caret';

		// On laisse passer le flash d'allumage avant de commencer à écrire
		setTimeout(function () {
			document.body.appendChild(caret);
			requestAnimationFrame(sweep);
		}, delayMs || 0);

		function sweep() {
			startCrackle(); // démarre (ou rejoint) dès que l'audio est autorisé
			var left = budget;
			while (left > 0 && idx < nodes.length) {
				var o = nodes[idx];
				var take = Math.min(left, o.t.length - off);
				off += take;
				left -= take;
				if (off >= o.t.length) {
					o.n.data = o.t;
					idx++;
					off = 0;
				} else {
					o.n.data = o.t.slice(0, off) + o.m.slice(off);
				}
			}
			if (idx >= nodes.length) {
				stopCrackle();
				caret.remove();
				return;
			}
			// Curseur de balayage sur le caractère en cours
			try {
				var cur = nodes[idx];
				var range = document.createRange();
				range.setStart(cur.n, Math.min(off, cur.n.data.length));
				range.setEnd(cur.n, Math.min(off + 1, cur.n.data.length));
				var rc = range.getBoundingClientRect();
				if (rc && rc.height) {
					caret.style.display = 'block';
					caret.style.left = rc.left + 'px';
					caret.style.top = rc.top + 'px';
					caret.style.width = Math.max(7, rc.width) + 'px';
					caret.style.height = rc.height + 'px';
				} else {
					caret.style.display = 'none';
				}
			} catch (e) {
				caret.style.display = 'none';
			}
			requestAnimationFrame(sweep);
		}
	}

	/* ------------------------------------------- compteur en francs ----- */

	function elapsedSec() {
		var t0 = parseInt(sessionStorage.getItem('d3615_t0') || '0', 10);
		return t0 ? Math.max(0, Math.floor((Date.now() - t0) / 1000)) : 0;
	}

	function costString() {
		return (elapsedSec() / 60 * 1.29).toFixed(2).replace('.', ',') + ' F';
	}

	function startCost() {
		if (!sessionStorage.getItem('d3615_t0')) {
			sessionStorage.setItem('d3615_t0', String(Date.now()));
		}
		var el = document.getElementById('d3615-cost');
		if (!el) return;
		function tick() {
			var s = elapsedSec();
			var mm = String(Math.floor(s / 60)).padStart(2, '0');
			var ss = String(s % 60).padStart(2, '0');
			el.textContent = 'DUREE ' + mm + ':' + ss + ' — COUT ' + costString();
		}
		tick();
		setInterval(tick, 1000);
	}

	/* --------------------------------------- barre de touches Minitel ----- */

	function buildBar() {
		var bar = document.createElement('div');
		bar.id = 'd3615-bar';
		bar.innerHTML =
			'<span class="d3615-key d3615-blink">3615 DOLI</span>' +
			'<span class="d3615-keys">' +
			'<span class="d3615-key"><b>S</b>SOMMAIRE</span>' +
			'<span class="d3615-key"><b>R</b>RETOUR</span>' +
			'<span class="d3615-key"><b>U</b>SUITE</span>' +
			'<span class="d3615-key"><b>G</b>GUIDE</span>' +
			'<span class="d3615-key"><b>F</b>FIN</span>' +
			'</span>' +
			'<span id="d3615-cost"></span>';
		document.body.appendChild(bar);
	}

	/* ------------------------------------------------------ guide ----- */

	function guideText() {
		var rows = [
			['S', 'SOMMAIRE', "RETOUR A L'ACCUEIL"],
			['R', 'RETOUR', 'PAGE PRECEDENTE'],
			['U', 'SUITE', 'PAGE SUIVANTE'],
			['G', 'GUIDE', 'AFFICHER / MASQUER CE GUIDE'],
			['F', 'FIN', 'DECONNEXION'],
			['B', 'BIP', 'SON DU CLAVIER ON/OFF'],
			['M', 'MINITEL INTEGRAL', 'MASQUER LA SOURIS']
		];
		var W = 52;
		var line = '+' + '-'.repeat(W) + '+';
		function row(s) { return '| ' + s.padEnd(W - 2) + ' |'; }
		function center(s) {
			var pad = W - s.length;
			var l = Math.floor(pad / 2);
			return '|' + ' '.repeat(l) + s + ' '.repeat(pad - l) + '|';
		}
		var out = [line, center("3615 DOLI - GUIDE D'UTILISATION"), line];
		rows.forEach(function (r) {
			out.push(row(' ' + r[0] + '  ' + r[1].padEnd(18) + ' ' + r[2]));
		});
		out.push(row(''));
		out.push(row(' TOUCHES ACTIVES HORS CHAMP DE SAISIE'));
		out.push(row(' ECHAP POUR FERMER'));
		out.push(line);
		out.push(center('TARIF : 1,29 F/MIN FACTURE A VOTRE PATRON'));
		out.push(line);
		return out.join('\n');
	}

	function toggleGuide(forceOff) {
		var g = document.getElementById('d3615-guide');
		if (!g) {
			if (forceOff) return;
			g = document.createElement('div');
			g.id = 'd3615-guide';
			var pre = document.createElement('pre');
			pre.textContent = guideText();
			g.appendChild(pre);
			g.addEventListener('click', function () { g.classList.remove('d3615-on'); });
			document.body.appendChild(g);
		}
		if (forceOff) g.classList.remove('d3615-on');
		else g.classList.toggle('d3615-on');
	}

	/* -------------------------------------------------------- FIN ----- */

	function doFin() {
		tone([1300], 0, 0.25, 0.12);
		tone([440], 0.35, 0.6, 0.12);
		var ov = document.createElement('div');
		ov.id = 'd3615-modem';
		ov.innerHTML = '<div class="d3615-title">3615 DOLI</div><pre></pre>';
		document.body.appendChild(ov);
		ov.querySelector('pre').textContent =
			'DECONNEXION . . .\nMERCI DE VOTRE VISITE\nCOUT DE LA SESSION : ' + costString();
		var a = document.querySelector('a[href*="logout.php"]');
		var url = a ? a.href : ROOT + '/user/logout.php';
		setTimeout(function () { window.location.href = url; }, 1400);
	}

	/* ---------------------------------------------------- clavier ----- */

	function onKey(e) {
		var t = e.target;
		var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'
			|| t.tagName === 'SELECT' || t.isContentEditable);

		if (e.key === 'Escape') toggleGuide(true);

		if (typing) {
			// Le clavier du Minitel fait bip
			if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key && e.key.length === 1) keyBeep();
			return;
		}
		if (e.ctrlKey || e.altKey || e.metaKey) return;

		switch ((e.key || '').toLowerCase()) {
			case 's': keyBeep(); window.location.href = ROOT + '/index.php?mainmenu=home'; break;
			case 'r': keyBeep(); history.back(); break;
			case 'u': keyBeep(); history.forward(); break;
			case 'g': keyBeep(); toggleGuide(); break;
			case 'f': keyBeep(); doFin(); break;
			case 'b': {
				var wasOn = soundOn();
				localStorage.setItem('d3615_mute', wasOn ? '1' : '0');
				toast(wasOn ? 'SON COUPE' : 'SON RETABLI');
				if (!wasOn) keyBeep();
				break;
			}
			case 'm': document.documentElement.classList.toggle('d3615-nomouse'); keyBeep(); break;
		}
	}

	/* ------------------------------------------------------ toast ----- */

	function toast(msg) {
		var t = document.getElementById('d3615-toast');
		if (!t) {
			t = document.createElement('div');
			t.id = 'd3615-toast';
			document.body.appendChild(t);
		}
		t.textContent = msg;
		t.classList.add('d3615-on');
		clearTimeout(toast.tm);
		toast.tm = setTimeout(function () { t.classList.remove('d3615-on'); }, 1400);
	}

	/* ------------------------------------------- allumage du tube ----- */

	function bootFlash() {
		var b = document.createElement('div');
		b.id = 'd3615-boot';
		document.body.appendChild(b);
		setTimeout(function () { b.remove(); }, 750);
	}

	/* ------------------------------------------------------ login ----- */

	var MODEM_LINES = [
		[200, 'CONNEXION AU SERVICE TELEMATIQUE'],
		[1250, 'COMPOSITION DU 36 15 . . .'],
		[2450, 'APPEL EN COURS'],
		[3500, 'NEGOCIATION PORTEUSE  1200/75 BAUDS'],
		[5000, 'CONNEXION ETABLIE'],
		[5400, 'TARIF : 1,29 F/MIN'],
		[5750, 'BIENVENUE SUR 3615 DOLI']
	];

	function setupLogin() {
		var form = document.getElementById('login') || document.querySelector('form[name="login"]');
		if (!form) return;
		form.addEventListener('submit', function (e) {
			if (form.dataset.d3615) return;
			e.preventDefault();
			form.dataset.d3615 = '1';
			playModem();
			var ov = document.createElement('div');
			ov.id = 'd3615-modem';
			ov.innerHTML = '<div class="d3615-title">3615 DOLI</div><pre></pre>';
			document.body.appendChild(ov);
			var pre = ov.querySelector('pre');
			MODEM_LINES.forEach(function (l) {
				setTimeout(function () {
					var div = document.createElement('div');
					pre.appendChild(div);
					typeText(div, l[1], 14);
				}, l[0]);
			});
			setTimeout(function () { form.submit(); }, MODEM_MS);
		});
	}

	/* ------------------------------------------------------- init ----- */

	function init() {
		if (!document.body) return;

		document.addEventListener('keydown', onKey);

		if (document.body.classList.contains('bodylogin')) {
			sessionStorage.removeItem('d3615_t0');
			var head = document.createElement('div');
			head.id = 'd3615-loginhead';
			head.textContent = '3615 DOLI';
			document.body.insertBefore(head, document.body.firstChild);
			paintScreen(150);
			setupLogin();
			return;
		}

		if (!TOP) { // iframes et popups : peinture et CSS suffisent
			paintScreen(100);
			return;
		}

		paintScreen(650); // on commence à écrire quand le flash d'allumage s'efface
		bootFlash();
		buildBar();
		startCost();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
