class Filters {

    /**
     * @param {Object} context
     * @returns {String} type of filter panel parameter: is it is page specific or global
     */
    static function getFilterParameterType(context) {
        return !!context.pageSpecific ? 'pageSpecific' : 'global';
    }

    /**
     * @param {Object} context
     * @param {String} explicitFilterType - optional, type of filter panel parameter: is it is page specific or global
     * @returns {Array} - array of strings with qids for filter panel
     */
    static function GetFilterQuestionsListByType(context, explicitFilterType) {

        var log = context.log;
        var bgLevelQids = [];
        var surveyLevelQids = [];
        var filterType = !explicitFilterType ? getFilterParameterType(context) : explicitFilterType;

        if(filterType === 'pageSpecific') {
            var pageId = PageUtil.getCurrentPageIdInConfig(context);
            bgLevelQids = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'PageSpecificFilters', true);
            surveyLevelQids = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'PageSpecificFiltersFromSurveyData', true);
        } else {
            bgLevelQids = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'Filters');
            surveyLevelQids = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'FiltersFromSurveyData');
        }

        return bgLevelQids && surveyLevelQids ? bgLevelQids.concat(surveyLevelQids) : [];
    }

    /**
     * @param {Object} context
     * @param {String} explicitFilterType - type of filter panel parameter: is it is page specific or global
     * @returns {Number} - number of bakground based filters of specified type
     */
    static function GetNumberOfBGFiltersByType(context, filterType) {

        if(filterType === 'global') {
            return DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'Filters').length;
        } else if (filterType === 'pageSpecific') {
            var pageId = PageUtil.getCurrentPageIdInConfig(context);
            return DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'PageSpecificFilters', true).length;
        }
    }

    /**
     * Hide filter placeholder if there's no filter question.
     * @param {object} context object {state: state, report: report, pageContext: pageContext, log: log}
     * @param {string} paramNum number of scripted filter
     * @returns {boolean} indicates if filter exists
     */
    static function hideScriptedFilterByOrder(context, paramNum) {

        var log = context.log;
        var pageHasSpecificFilters = PageUtil.PageHasSpefcificFilters(context);
        var isPageSpecificParameter = !!context.pageSpecific;
        var filterList = [];

        if(!isPageSpecificParameter) {

            if(pageHasSpecificFilters) {
                return true;
            }

            filterList = GetFilterQuestionsListByType(context, 'global');
            var pageId = PageUtil.getCurrentPageIdInConfig(context);
            var numberOfBGFilters = GetNumberOfBGFiltersByType(context, 'global');

            // paramNum should be less than number of filter components on all pages
            // paramNum should be less than number of filters based on BG vars on Response Rate page
            if (paramNum > filterList.length || (pageId === 'Page_Response_Rate' && paramNum > numberOfBGFilters)) {
                return true; // hide
            }
            return false;
        }

        if(isPageSpecificParameter) {

            if(!pageHasSpecificFilters) {
                return true;
            }
            filterList = GetFilterQuestionsListByType(context, 'pageSpecific');
            return paramNum > filterList.length;
        }

        throw new Error('Fiters.hideScriptedFilterByOrder: unknown combination of filter type and page');

    }


    /**
     * Get scripted filter title.
     * @param {object} context object {state: state, report: report, log: log}
     * @param {string} paramNum number of scripted filter
     * @returns {string} question title
     */
    static function getScriptedFilterNameByOrder(context, paramNum) {

        var log = context.log;
        var filterList = GetFilterQuestionsListByType(context);

        if (paramNum <= filterList.length) {
            return QuestionUtil.getQuestionTitle(context, filterList[paramNum - 1]);
        }

        return '';
    }

    /**
     * Populate filter parameters.
     * @param {object} context object {state: state, report: report, log: log}
     * @param {number} paramNum number of filter
     */
    static function populateScriptedFilterByOrder(context, paramNum) {

        var log = context.log;
        var parameter = context.parameter;
        var filterList = GetFilterQuestionsListByType(context);

        // no question for this parameter placeholder
        if (filterList && filterList.length < paramNum) {
            return;
        }

        var answers: Answer[] = QuestionUtil.getQuestionAnswers(context, filterList[paramNum - 1]);

        for (var i = 0; i < answers.length; i++) {
            var val = new ParameterValueResponse();
            val.StringValue = answers[i].Text;
            val.StringKeyValue = answers[i].Precode;
            parameter.Items.Add(val);
        }

        return;
    }

    /**
     * @param {Object} context
     * @returns {Array} - array of filter indexes which questions don't have answers; needed for pulse programs only
     */
    static function getHiddenFilterIndexes(context) {

        var log = context.log;

        if(DataSourceUtil.isProjectSelectorNotNeeded(context) || PageUtil.PageHasSpefcificFilters(context)) {
            return [];
        }

        //pulse program, one of main pages
        var activeQids = PulseProgramUtil.getPulseSurveyContentInfo_ItemsWithData(context);
        var filters =  GetFilterQuestionsListByType(context, 'global');
        var invalidIndexes = [];

        var startIndex = GetNumberOfBGFiltersByType(context, 'global'); 

        for(var i=startIndex; i<filters.length; i++) {
            if(!activeQids.hasOwnProperty(filters[i])) {
                invalidIndexes.push(i+1);
            }
        }

        return invalidIndexes;

    }

    //================================ FILTER PANEL EXPR START ====================================

    /**
     * Reset filter parameters.
     * @param {object} context object {state: state, report: report, log: log}
     */
    static function ResetAllFilters(context) {

        var log = context.log;
        var filterNames = [];
        var i;

        var filterSurveyLevelParameters = GetFilterQuestionsListByType(context, 'global');
        for (i = 0; i < filterSurveyLevelParameters.length; i++) {
            filterNames.push('p_ScriptedFilterPanelParameter' + (i + 1));
        }

        //hardcoded because pages may have different amount of page specific filters
        var maxNumberOfPageSpecificFilters = 10;
        for (i = 0; i < maxNumberOfPageSpecificFilters; i++) {
            filterNames.push('p_ScriptedPageFilterPanelParam' + (i + 1));
        }

        ParamUtil.ResetParameters(context, filterNames);
        return;
    }

    /**
     * @param {Object} context
     * @param {String} paramId filter panel parameter id
     * @param {String} qId - question the parameter is based on
     */
    static function GetIndividualFilterExpression(context, paramId, qId) {

        var state = context.state;
        var ds = DataSourceUtil.getPageDsId(context);

        if (!state.Parameters.IsNull(paramId)) {
            // support for multi select. If you need multi-selectors, no code changes are needed, change only parameter setting + ? list css class
            var responses = ParamUtil.GetSelectedCodes(context, paramId);
            var individualFilterExpr = [];
            for (var j = 0; j < responses.length; j++) {
                individualFilterExpr.push('IN(' + ds + ':' + qId + ', "' + responses[j] + '")');
            }
            return '(' + individualFilterExpr.join(' OR ') + ')';
        }

        return null;
    }


    /**
     * @description - build filter panel expression
     * @param {Object} context
     * @param {String} explicitFilterType - optional, 'pageSpecific' or 'global'; needed jic
     * @param {String} varType - optional, 'background' or 'survey' to handle extra cases of removing of survey based filters on response rate tables
     */
    static function GetFilterPanelExpression(context, explicitFilterType, varType) {

        var log = context.log;
        var filterType = explicitFilterType ? explicitFilterType : (PageUtil.PageHasSpefcificFilters(context) ? 'pageSpecific' : 'global');
        var filterList = GetFilterQuestionsListByType(context, filterType); //global or page specifics
        var filterPrefix = (filterType === 'pageSpecific') ? 'p_ScriptedPageFilterPanelParam' : 'p_ScriptedFilterPanelParameter';

        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        var startIndex = 0;
        var lastIndex = filterList.length;

        if(pageId === 'Page_Response_Rate' || varType === 'background') { //apply only bg based filters
            lastIndex = GetNumberOfBGFiltersByType(context, filterType)-1;
        }

        if(varType === 'survey') {
            startIndex = GetNumberOfBGFiltersByType(context, filterType); 
        }

        var filterExpr =  [];

        for(var i=startIndex; i<lastIndex; i++) {
            var indExpr = GetIndividualFilterExpression(context, filterPrefix+''+(i+1), filterList[i]);
            if(indExpr) {
                filterExpr.push(indExpr);
            }
        }

        return filterExpr.join(' AND ');
    }

   //================================ FILTER PANEL EXPR END ====================================

    /**
     * @function GetFilterValues
     * @description returns selected filter options
     * @param {Object} context
     * @returns {Array} Array of objects {Label: label, selectedOptions: [{Label: label, Code: code}]}
     */
    static function GetFiltersValues(context, filterType) {

        var log = context.log;

        var filterValues = [];
        var filters = GetFilterQuestionsListByType(context, filterType);
        var filterPrefix = (filterType === 'pageSpecific') ? 'p_ScriptedPageFilterPanelParam' : 'p_ScriptedFilterPanelParameter';

        for (var i = 0; i < filters.length; i++) {
            // support for multi select. If you need multi-selectors, no code changes are needed, change only parameter setting + ? list css class
            var selectedOptions = ParamUtil.GetSelectedOptions(context, filterPrefix + (i + 1));
            var filterName = getScriptedFilterNameByOrder(context, i + 1);

            if (selectedOptions.length > 0) {
                filterValues.push({ Label: filterName, selectedOptions: selectedOptions });
            }
        }

        return filterValues;
    }


    /**
     * @function getFilterExpressionByAnswerRange
     * @description function to generate a script expression to filter by options of single question
     * @param {Object} context
     * @param {String} qId - question id
     * @param {Array} answerCodes - the array of answer codes to include
     * @returns {String} filter script expression
     */
    static function getFilterExpressionByAnswerRange(context, qId, answerCodes) {

        var log = context.log;

        if (!(answerCodes instanceof Array)) {
            throw new Error('Filters.getFilterExpressionByAnswerRange: answerCodes is not an array; filter for ' + qId);
        }

        qId = QuestionUtil.getQuestionIdWithUnderscoreInsteadOfDot(qId);

        if (answerCodes.length) {
            return 'IN(' + qId + ', "' + answerCodes.join('","') + '")';
        }
        return '';
    }

    /**
     * @description function indicationg if time period filter set is needed or not
     * @param {Object} context
     * @returns {Boolean} true or false
     */
    static function isTimePeriodFilterHidden(context) {
        return DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'IsTimePeriodFilterHidden');
    }

    /**
     * @description function indicationg if the wave filter is needed or not
     * @param {Object} context
     * @returns {Boolean} true or false
     */
    static function isWaveFilterHidden(context) {
        var log = context.log;
        return (Boolean)(!DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'WaveQuestion'));
    }

    /**
     * @description function to generate a script expression to filter by selected time period
     * @param {Object} context
     * @param {String} qId - date question id
     * @returns {String} filter script expression
     */
    static function getTimePeriodFilter(context, qId) {

        var log = context.log;

        if (isTimePeriodFilterHidden(context)) { // date period filter is hidden in pulse programs
            return '';
        }

        var timePeriod = DateUtil.defineDateRangeBasedOnFilters(context);
        var expression = [];

        // example: interview_start >= TODATE("2019-03-31")
        if (timePeriod.hasOwnProperty('startDateString') && timePeriod.startDateString) {
            expression.push(qId + '>=TODATE("' + timePeriod.startDateString + '")');
        }

        if (timePeriod.hasOwnProperty('endDate') && timePeriod.endDateString) {
            expression.push(qId + '<=TODATE("' + timePeriod.endDateString + '")');
        }

        return expression.join(' AND ');
    }

    /**
     * @description function to generate a script expression to filter by selected time period
     * @param {Object} context
     * @returns {String} filter script expression
     */
    static function getCurrentWaveExpression(context) {

        var log = context.log;

        if (isWaveFilterHidden(context)) {
            return '';
        }

        var qId = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'WaveQuestion');
        var selectedCodes = ParamUtil.GetSelectedCodes(context, 'p_Wave');

        if (selectedCodes.length) {
            return getFilterExpressionByAnswerRange(context, qId, [selectedCodes[0]]); // wave filter shouldn't support multiple selection
        }

        return '';
    }

    /**
     * not empty comments filter
     * @param {context}
     * @param {Array} question list
     * @returns {string} filter expression
     */
    static function notEmptyCommentsFilter(context, questions) {

        var expressions = [];

        for (var i = 0; i < questions.length; i++) {

            var qid = QuestionUtil.getQuestionIdWithUnderscoreInsteadOfDot(questions[i]);
            expressions.push('NOT ISNULL(' + qid + ') AND ' + qid + ' != "" AND ' + qid + ' != " "');
        }
        return expressions.join(' OR ');
    }

    /*
      * not empty comments filter
      * @param {context}
      * @param {string} KPIGroupName: KPIPositiveAnswerCodes, KPINegativeAnswerCodes (as in Config)
      * @return {string} filter expression
      */
    static function filterByKPIGroup(context, KPIGroupName) {

        var kpiQids = ParamUtil.GetSelectedCodes(context, 'p_QsToFilterBy');
        var kpiQidsConfig = DataSourceUtil.getPagePropertyValueFromConfig(context, 'Page_KPI', 'KPI');
        var kpiQidsConfig = DataSourceUtil.getPagePropertyValueFromConfig(context, 'Page_KPI', 'KPI');
        var qId;

        if (kpiQidsConfig.length == 1) {
            qId = QuestionUtil.getQuestionIdWithUnderscoreInsteadOfDot(kpiQidsConfig[0]);
        } else {
            qId = QuestionUtil.getQuestionIdWithUnderscoreInsteadOfDot(kpiQids[0]);
        }
        var answerCodes = DataSourceUtil.getPagePropertyValueFromConfig(context, 'Page_KPI', KPIGroupName);

        return getFilterExpressionByAnswerRange(context, qId, answerCodes);

    }

    /*
* @function getOnlyOwnActionsExpression
* @description function to generate a script expression to filter Actions page to only show own actions (where actionowner = current end user viewing the report).
* Checkbox is available for user roles specified for "ReportLevelAccess" feature in Config (for other end users only own actions are shown on default).
* @param {Object} context
* @return {String} filter script expression
*/

    static function getOnlyOwnActionsExpression (context) {

        var state = context.state;

        if ((!state.Parameters.IsNull("p_OnlyOwnActions")) || (!PageActions.isFeatureAvailableForUserRole(context, "ReportLevelAccess"))) {
            var userId = context.user.UserId;
            return 'IN(actionowner, "' + userId + '")';
        }

        return '';
    }

    /*
    * @function getOnlyOwnActionsinHitlistExpression
    * @description function to switch on the possibility to edit/delete comments (all comments for roles specified in 'EditOrDeleteOthersActions' feature, only own for others)
    * @param {Object} context
    * @return {String} filter script expression
    */

    static function getOnlyOwnActionsinHitlistExpression (context) {

        var state = context.state;

        if(!PageActions.isFeatureAvailableForUserRole(context, "EditOrDeleteOthersActions")){
	   //&& !state.Parameters.IsNull("p_SwitchHitlistMode")) {
            return 'IN(actionowner, "' + context.user.UserId + '")';
        }
        return '';
    }

    /**
     * Actions get registred after Save btn is clicked, before that user can change their mind.
     * However some data about intended action is stored already and causes discrepan
     * @param {Object} context
     * @retu {String}
     */
    static function excludeNotRegistredActions(context) {
        return "NOT ISNULL("+DataSourceUtil.getDsId(context)+": regDate)";
    }

    /*
    * @function getSelectedEndUsersExpression
    * @description function to generate a script expression to filter EndUserStatistics_Hidden and EndUserStatistics tables by end users selected from dropdown.
    * On default all users are filtered out.
    * @param {Object} context
    * @return {String} filter script expression
    */

    static function getSelectedEndUsersExpression (context) {

        var log = context.log;
        var answerCodes = ParamUtil.GetSelectedCodes(context, 'p_EndUserSelection');
        var qId = DataSourceUtil.getPagePropertyValueFromConfig (context, 'Page_Actions', 'EndUserSelection');

        if (answerCodes.length) {
            return getFilterExpressionByAnswerRange(context, qId, answerCodes);
        }
        return 'NOT IN(' + qId +', PValStrArr("p_EndUserSelection"))';
    }

    /*
	* filter by particular project in pulse program
	* @param {context} {state: state, report: report}
	* @param {string}
	* @return {string} filter expression
    */
    static function projectSelectorInPulseProgram(context) {

        var log = context.log;
        var pidFromPageContext = context.pageContext.Items['p_projectSelector'];
        var ds = DataSourceUtil.getProgramDsId(context);

        if (DataSourceUtil.isProjectSelectorNotNeeded(context) || ds !== DataSourceUtil.getPageDsId(context)) {
            return '';
        }
        
        if (pidFromPageContext) {
            return ds+':source_projectid = "' + pidFromPageContext + '"';
        }

        var val = ParamUtil.GetSelectedCodes(context, 'p_projectSelector');
        return ds+':source_projectid = "' + val[0] + '"';
    }

    /**
     * @description function to generate a script expression to filter by particular project
     * @param {Object} context
     * @param {String} projectId
     * @returns {String} filter script expression
     */
    static function getProjectExpression(context, projectId) {

        var ds = DataSourceUtil.getProgramDsId(context);
        return ds+':source_projectid = "' + projectId + '"';
    }

    /**
     * benchmark table may have references to previous wave and to upper hierarchy levels so they are excluded from the table,
     * but for base clac we still need them
     * @param {context} {state: state, report: report}
     * @param {string} hierLevel
     * @param {string} waveId
     * @param {string} projectId
     * @returns {string} filter expression
     */

    static function getHierarchyAndWaveFilter(context, hierLevel, waveId, projectId) {

        var log = context.log;

        var excludedFilters = [];
        var hierFilter = hierLevel ? HierarchyUtil.getHierarchyFilterExpressionForNode(context, hierLevel) : HierarchyUtil.getHierarchyFilterExpressionForCurrentRB(context); // '' if hierarchy is not defined
        var waveQId = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'WaveQuestion');
        var waveFilter = waveId ? getFilterExpressionByAnswerRange(context, waveQId, [waveId]) : getCurrentWaveExpression(context);
        var projectFilter = projectId ? getProjectExpression(context, projectId) : projectSelectorInPulseProgram(context);

        if(projectFilter) {
            excludedFilters.push(projectFilter);
        }

        if (hierFilter) {
            excludedFilters.push(hierFilter);
        }

        if (waveFilter) {
            excludedFilters.push(waveFilter);
        }

        return excludedFilters.join(' AND ');
    }

    /**
     * function returns hierarchy based filter expression for pulse survey selector drop down
     * @param {Object} context
     * @returns {String} filter expression
     */
    static function getPulseSurveyData_FilterByHierarchy(context) {

        var user = context.user;
        var showAll = ParamUtil.GetSelectedCodes(context, 'p_ShowAllPulseSurveys').length; // there's only one answer showAll (len=1) or not (len =0)

        if (showAll) {
            return '';
        }

        var expr = '';

        if (user.UserType === ReportUserType.Confirmit) { // for tests
            var bases = user.PersonalizedReportBase;
            expr = 'CreatedByEndUserName = ""';
        } else {
            expr = 'CreatedByEndUserName = "' + user.UserId + '"';
        }

        return expr;
    }
}
