<?php
/* Copyright (C) 2026  DevCamp
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * \defgroup   doli3615    Module Doli3615
 * \brief      3615 DOLI - Votre ERP sur Minitel
 *
 * \file       htdocs/custom/doli3615/core/modules/modDoli3615.class.php
 * \ingroup    doli3615
 * \brief      Descripteur du module 3615 DOLI
 */

include_once DOL_DOCUMENT_ROOT.'/core/modules/DolibarrModules.class.php';

/**
 * Module descriptor class for 3615 DOLI
 */
class modDoli3615 extends DolibarrModules
{
	/**
	 * Constructor
	 *
	 * @param DoliDB $db Database handler
	 */
	public function __construct($db)
	{
		global $langs, $conf;

		$this->db = $db;

		// 36-15, evidemment
		$this->numero = 500361;
		$this->rights_class = 'doli3615';

		$this->family = "interface";
		$this->module_position = '90';
		$this->name = preg_replace('/^mod/i', '', get_class($this));
		$this->description = "3615 DOLI - Votre ERP sur Minitel. Tarif : 1,29 F/min.";
		$this->descriptionlong = "Transforme tout Dolibarr en terminal Minitel : ecran noir, texte vert phosphore,"
			." scanlines, bruit de modem a la connexion (composition reelle du 36 15 en DTMF),"
			." touches Minitel (SOMMAIRE, RETOUR, SUITE, GUIDE, FIN) et compteur de cout de connexion en francs."
			." Zero utilite. 100% ambiance. Appuyez sur G pour le guide.";

		$this->editor_name = 'DevCamp';
		$this->editor_url = '';

		$this->version = '1.0.0';
		$this->const_name = 'MAIN_MODULE_'.strtoupper($this->name);
		$this->picto = 'fa-tv';

		// CSS et JS injectes sur toutes les pages (page de login comprise)
		$this->module_parts = array(
			'css' => array('/doli3615/css/doli3615.css'),
			'js' => array('/doli3615/js/doli3615.js'),
		);

		$this->dirs = array();
		$this->config_page_url = array();

		$this->hidden = false;
		$this->depends = array();
		$this->requiredby = array();
		$this->conflictwith = array();
		$this->langfiles = array();
		$this->phpmin = array(7, 1);
		$this->need_dolibarr_version = array(16, 0);

		$this->const = array();
		$this->tabs = array();
		$this->dictionaries = array();
		$this->boxes = array();
		$this->cronjobs = array();
		$this->rights = array();
		$this->menu = array();
	}

	/**
	 * Function called when module is enabled.
	 *
	 * @param  string $options Options when enabling module
	 * @return int             1 if OK, 0 if KO
	 */
	public function init($options = '')
	{
		$sql = array();

		return $this->_init($sql, $options);
	}

	/**
	 * Function called when module is disabled.
	 *
	 * @param  string $options Options when disabling module
	 * @return int             1 if OK, 0 if KO
	 */
	public function remove($options = '')
	{
		$sql = array();

		return $this->_remove($sql, $options);
	}
}
