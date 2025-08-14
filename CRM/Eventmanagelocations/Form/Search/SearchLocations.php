<?php

/**
 * A custom contact search
 */
class CRM_Eventmanagelocations_Form_Search_SearchLocations extends CRM_Contact_Form_Search_Custom_Base implements CRM_Contact_Form_Search_Interface {

  /**
   * Prepare a set of search fields
   *
   * @param CRM_Core_Form $form modifiable
   * @return void
   */
  public function buildForm(&$form) {
    $config = CRM_Core_Config::singleton();
    $countryDefault = $config->defaultContactCountry;

    $title = ts('Locations Listing');

    CRM_Utils_System::setTitle($title);

    $form->assign('loc_srch_title', $title);

    $form->add('text','address_name',ts('Address Name'));
    $form->add('text','street_address',ts('Street Address'));
    $form->add('text','city',ts('City'));

    $form->addChainSelect('state_province_id');
    $country = ['' => ts('- select -')] + CRM_Core_PseudoConstant::country();
    $form->add('select', 'country_id', ts('Country'), $country, TRUE, ['class' => 'crm-select2']);

    // Optionally define default search values
    $form->setDefaults(
      array(
      'address_name' => '',
      'street_address' => '',
      'city' => '',
      'country_id' => $countryDefault,
    ));

    /**
     * if you are using the standard template, this array tells the template what elements
     * are part of the search criteria
     */
    $form->assign('elements', array('address_name','street_address','city','country_id', 'state_province_id',));

    if(isset($_REQUEST['csid'])) {
      if(isset($_SESSION["loc_srch_qfkey"])) {
        unset($_SESSION["loc_srch_qfkey"]);
      }
      $_SESSION["loc_srch_csid"] = $_REQUEST['csid'];
    }
  }

  public function buildTaskList(CRM_Core_Form_Search $form) {
    return array();
  }

  /**
   * Get a list of summary data points
   *
   * @return mixed; NULL or array with keys:
   *  - summary: string
   *  - total: numeric
   */
  public function summary() {
    return NULL;
  }

  /**
   * Get a list of displayable columns
   *
   * @return array, keys are printable column headers and values are SQL column names
   */
  public function &columns() {
    if(isset($_REQUEST['qfKey']) ) {
      if(isset($_SESSION["loc_srch_csid"])) {
        unset($_SESSION["loc_srch_csid"]);
      }
      $_SESSION["loc_srch_qfkey"] = $_REQUEST['qfKey'];
    }
    // return by reference
    $columns = array(
      ts('Id') => 'location_block_id',
      ts('Address Name') => 'address_name',
      ts('Street Address') => 'street_address',
      ts('City') => 'city',
      ts('Country') => 'country',
      ts('State/Province') => 'state',
    );
    return $columns;
  }

  /**
   * Construct a full SQL query which returns one page worth of results
   *
   * @param int $offset
   * @param int $rowcount
   * @param null $sort
   * @param bool $includeContactIDs
   * @param bool $justIDs
   * @return string, sql
   */
  public function all($offset = 0, $rowcount = 0, $sort = NULL, $includeContactIDs = FALSE, $justIDs = FALSE) {
    // delegate to $this->sql(), $this->select(), $this->from(), $this->where(), etc.
    return $this->sql($this->select(), $offset, $rowcount, $sort, $includeContactIDs, NULL);
  }

  /**
   * Construct a SQL SELECT clause
   *
   * @return string, sql fragment with SELECT arguments
   */
  public function select() {
    return "
    loc_block.id as location_block_id,
    address.city as city,
    state.name as state,
    country.name as country,
    email.email as email,
    phone.phone as phone,
    address.name as address_name,
    address.street_address as street_address
    ";
  }

  /**
   * Construct a SQL FROM clause
   *
   * @return string, sql fragment with FROM and JOIN clauses
   */
  public function from() {
    return "
    from civicrm_loc_block loc_block
    left join civicrm_address address on (loc_block.address_id = address.id )
    left join civicrm_email email on (loc_block.email_id = email.id)
    left join civicrm_phone phone on (loc_block.phone_id = phone.id)
    left join civicrm_state_province state on (address.`state_province_id` = state.`id`)
    left join civicrm_country country on (address.`country_id` = country.`id`)
    ";
  }

  /**
   * Construct a SQL WHERE clause
   *
   * @param bool $includeContactIDs
   * @return string, sql fragment with conditional expressions
   */
  public function where($includeContactIDs = FALSE) {
    $params = array();
    $where = "";
    $count  = 1;
    $clause = array();
    $form_value = null;
    //address_name
    $form_value = $this->_formValues['address_name'] ?? NULL;
    if ($form_value != NULL) {
      if (strpos($form_value, '%') === FALSE) {
        $form_value = "%{$form_value}%";
      }
      $params[$count] = array($form_value, 'String');
      $clause[] = "address.name LIKE %{$count}";
      $count++;
    }
    //street_address
    $form_value   = $this->_formValues['street_address'] ?? NULL;
    if ($form_value != NULL) {
      if (strpos($form_value, '%') === FALSE) {
        $form_value = "%{$form_value}%";
      }
      $params[$count] = array($form_value, 'String');
      $clause[] = "address.street_address LIKE %{$count}";
      $count++;
    }
    //city
    $form_value = $this->_formValues['city'] ?? NULL;
    if ($form_value != NULL) {
      if (strpos($form_value, '%') === FALSE) {
        $form_value = "%{$form_value}%";
      }
      $params[$count] = array($form_value, 'String');
      $clause[] = "address.city LIKE %{$count}";
      $count++;
    }
    //country
    $form_value = $this->_formValues['country_id'] ?? NULL;
    if ($form_value) {
      $params[$count] = array($form_value, 'Integer');
      $clause[] = "country.id = %{$count}";
      $count++;
    }
    $form_value = $this->_formValues['state_province_id'] ?? NULL;
    if ($form_value) {
      $params[$count] = array($form_value, 'Integer');
      $clause[] = "state.id = %{$count}";
    }
    if (!empty($clause)) {
      $where .=  implode(' AND ', $clause);
    }
    return $this->whereClause($where, $params);
  }

  public function count() {
    return CRM_Core_DAO::singleValueQuery($this->sql('count(distinct loc_block.id) as total'));
  }

  /**
   * Determine the Smarty template for the search screen
   *
   * @return string, template path (findable through Smarty template path)
   */
  public function templateFile() {
    return 'CRM/Eventmanagelocations/Form/Search/SearchLocations.tpl';

  }

  public function validateUserSQL($sql, $onlyWhere = FALSE): void {
  }

  /**
   * Fill the prevNextCache with the found contacts
   *
   * @return bool TRUE if the search was able to process it.
   */
  public function fillPrevNextCache($cacheKey, $start, $end, $sort): bool {
    return TRUE;
  }

}
