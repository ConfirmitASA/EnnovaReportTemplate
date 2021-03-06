class PageResults {

    /*
  * Assemble Statements table
  * @param {object} context: {state: state, report: report, log: log, table: table, pageContext: pageContext, suppressSettings: suppressSettings}
  * @param {string} bannerId: explicit bannerId to use, not mandotary
  * @param {boolean} isNormalizedTable: true for table for normalized questions
  */
    static function tableStatements_Render(context, bannerId, isNormalizedTable) {

        var table = context.table;
        var log = context.log;
        var suppressSettings = context.suppressSettings;

        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var areEmptyRowsShown = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'ShowEmptyRows');

        tableStatements_AddColumns(context, bannerId, isNormalizedTable);
        tableStatements_AddRows(context, isNormalizedTable);
        tableStatements_ApplyConditionalFormatting(context);
        SuppressUtil.setTableSuppress(table, suppressSettings);

        table.Decimals = Config.Decimal;
        table.RowNesting = TableRowNestingType.Nesting;
        table.RemoveEmptyHeaders.Rows = !areEmptyRowsShown;
        table.Caching.Enabled = false;
    }

    /*
  * Hide Statements table because of suppress or absence of dimensions/statements
  * @param {object} context: {confirmit: confirmit, state: state, report: report, log: log, table: table}
  * @param {boolean} isNormalizedTable: true for table for normalized questions
  */
    static function tableStatements_Hide(context, isNormalizedTable) {
        return SuppressUtil.isGloballyHidden(context) || tableStatementsHasNoDimensions(context, isNormalizedTable);
    }

    /*
  * Checks if Statements table has dimensions/statements
  * @param {object} context: {confirmit: confirmit, state: state, report: report, log: log, table: table}
  * @param {boolean} isNormalizedTable: true for table for normalized questions
  */
    static function tableStatementsHasNoDimensions(context, isNormalizedTable) {

        var log = context.log;
        var isPulseProgram = !DataSourceUtil.isProjectSelectorNotNeeded(context);
        var isOnePulseProjectSelected = isPulseProgram && ParamUtil.GetSelectedCodes(context, 'p_projectSelector').length === 1;
        var showCustomQuestions = isOnePulseProjectSelected && ParamUtil.GetSelectedCodes(context, 'p_Results_TableTabSwitcher')[0] === 'custom';
        var resultArr = [];

        if (showCustomQuestions) {
            return isNormalizedTable; //always hide normalized table on custom questions tab
        }

        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var resultStatements = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'ResultStatements');
        var dimensions = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'Dimensions');

        if (resultStatements && resultStatements.length > 0) {
            for (var i = 0; i < resultStatements.length; i++) {
                var isNormalizedQuestion = resultStatements[i].indexOf('_normalized') != -1;
                if ((isNormalizedTable && isNormalizedQuestion) || (!isNormalizedTable && !isNormalizedQuestion)) {
                    resultArr.push(resultStatements[i]);
                }
            }
        } else if (dimensions && dimensions.length > 0) {

            if (!isNormalizedTable && Export.isExcelExportMode(context)) { //never hide first table for excel export - custom questions are added there
                return false;
            }

            var activeCats = getActiveCategorizations(context);
            if (!activeCats) { //no active dimensions
                return true;
            }

            var normalizedCats = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'DimensionsWithNormalizedQuestions');
            //active dimensions exist, no normalized dimensions in conig
            if (!normalizedCats) {
                return isNormalizedTable;
            }

            var normalizedCatsStr = normalizedCats.join('$') + '$';
            for (var i = 0; i < activeCats.length; i++) {
                var ind = normalizedCatsStr.indexOf(activeCats[i] + '$');
                if ((ind >= 0 && isNormalizedTable) || (ind == -1 && !isNormalizedTable)) {
                    resultArr.push(activeCats[i]);
                }
            }
        }

        //no active regular dimensions/statements for Statements table, no active normalized dimensions/satements for StatementsNorm table
        return resultArr.length > 0 ? false: true;
    }

    /*
  * Column Banner selector for Statements table
  * @param {object} context: {state: state, report: report, log: log, table: table}
  * @param {string} bannerId: explicit bannerId to use, not mandotary
  * @param {boolean} isNormalizedTable: true for table for normalized questions
  */

    static function tableStatements_AddColumns(context, bannerId, isNormalizedTable) {

        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        tableStatements_AddColumns_Banner0(context, isNormalizedTable); // default set
        return;

    }

    /*
  * Add set of rows based on questions or categorizations (for pulse)
  * @param {object} context: {state: state, report: report, log: log, table: table}
  * @param {boolean} isNormalizedTable: true for table for normalized questions
  */
    static function tableStatements_AddRows(context, isNormalizedTable) {

        var log = context.log;
        var isPulseProgram = !DataSourceUtil.isProjectSelectorNotNeeded(context);
        var isOnePulseProjectSelected = isPulseProgram && ParamUtil.GetSelectedCodes(context, 'p_projectSelector').length === 1;
        var showCustomQuestions = isOnePulseProjectSelected && ParamUtil.GetSelectedCodes(context, 'p_Results_TableTabSwitcher')[0] === 'custom';
        var numberOfAddedBanners = 0;

        var showDimensions = isDimensionsMode(context);

        if (!showCustomQuestions && !showDimensions) {
            tableStatements_AddRows_Banner0(context, isNormalizedTable);
            numberOfAddedBanners++;
        } else if (!showCustomQuestions && showDimensions) {
            tableStatements_AddRows_Banner1(context, isNormalizedTable);
            numberOfAddedBanners++;
        }

        if (showCustomQuestions || (Export.isExcelExportMode(context) && !isNormalizedTable)) {
            tableStatements_AddRows_Banner2(context, isNormalizedTable);
            numberOfAddedBanners++;
        }

    }

    /*
  * Add statement questions as table rows based on Survey Config-> Page_Result-> ResultStatements
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  *  @param {boolean} isNormalizedTable: true for table for normalized questions
  */
    static function tableStatements_AddRows_Banner0(context, isNormalizedTable) {

        var table = context.table;
        var log = context.log;
        var questions = DataSourceUtil.getPagePropertyValueFromConfig(context, PageUtil.getCurrentPageIdInConfig(context), 'ResultStatements');

        for (var i = 0; i < questions.length; i++) {

            var isNormalizedQuestion = questions[i].indexOf('_normalized') != -1;
            if ((isNormalizedTable && isNormalizedQuestion) || (!isNormalizedTable && !isNormalizedQuestion)) {
                var questionnaireElement: QuestionnaireElement = QuestionUtil.getQuestionnaireElement(context, questions[i]);
                var headerQuestion: HeaderQuestion = new HeaderQuestion(questionnaireElement);
                headerQuestion.IsCollapsed = true;
                TableUtil.maskOutNA(context, headerQuestion);
                TableUtil.addBreakByNestedHeader(context, headerQuestion);
                table.RowHeaders.Add(headerQuestion);
            }
        }
    }

    /*
  * Add categorizations as table rows based on Survey Config-> Page_Result-> Dimensions property
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  *  @param {boolean} isNormalizedTable: true for table for normalized questions
  */
    static function tableStatements_AddRows_Banner1(context, isNormalizedTable) {

        var table = context.table;
        var log = context.log;

        var categorizations = getActiveCategorizations(context); //DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'Dimensions');
        var tabSwitcher = ParamUtil.GetSelectedCodes(context, 'p_Results_TableTabSwitcher');
        var isDimensionVisible = tabSwitcher.length === 0 || tabSwitcher[0] === 'withDims';

        for (var i = 0; i < categorizations.length; i++) {

            var catIncludesNormalizedQuestions = isNormalizedDimension(context, categorizations[i]);

            if ((isNormalizedTable && catIncludesNormalizedQuestions) || (!isNormalizedTable && !catIncludesNormalizedQuestions)) {
                var categorization: HeaderCategorization = new HeaderCategorization();
                categorization.CategorizationId = String(categorizations[i]).replace(/[ ,&]/g, '');
                categorization.DataSourceNodeId = DataSourceUtil.getDsId(context);
                categorization.DefaultStatistic = StatisticsType.Average;
                categorization.CalculationRule = CategorizationType.AverageOfAggregates; // AvgOfIndividual affects performance
                categorization.Preaggregation = PreaggregationType.Average;
                categorization.SampleRule = SampleEvaluationRule.Max; // https://jiraosl.firmglobal.com/browse/TQA-4116
                categorization.Collapsed = false;
                categorization.Totals = isDimensionVisible;

                TableUtil.addBreakByNestedHeader(context, categorization);
                table.RowHeaders.Add(categorization);
            }
        }

        table.TotalsFirst = true;
    }

    /**
     * Retuns active categorizations for particular baby survey from pulse program it'll be limited list of categorizations.
     * @param {object} context: {state: state, report: report, log: log, table: table}
     * @param {DBDesignerTable} DBTable
     * @param {String} pid
     * @return {array} array of categorization ids
     */
    static function getActiveCategorizationsForPulseSurvey(context, DBTable, pid) {

        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var dimensionsInConfig = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'Dimensions');
        var dimensions = DBTable.GetColumnValues('__l9', 'id', pid); //only one or none

        if (dimensions && dimensions.Count > 0) {

            var activeDimesions = []; //intersection of config and survey content; config alows to exclude dimensions
            var configDimensionsStr = dimensionsInConfig.join('$') + '$';
            configDimensionsStr = configDimensionsStr.toLowerCase();
            var dimensionsArr = dimensions[0].split(',');

            for (var i = 0; i < dimensionsArr.length; i++) {
                if (dimensionsArr[i] !== '' && configDimensionsStr.indexOf(dimensionsArr[i].toLowerCase() + '$') > -1) {
                    activeDimesions.push(dimensionsArr[i]);
                }
            }
            return activeDimesions.length > 0 ? activeDimesions: dimensionsInConfig; //return something to avoid table crush
        }
        return [];
    }

    /**
     * Retuns active categorizations. For baby surveys from pulse program it'll be limited list of categorizations.
     * @param {object} context: {state: state, report: report, log: log, table: table}
     * @return {array} array of categorization ids
     */
    static function getActiveCategorizations(context) {

        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var dimensionsInConfig = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'Dimensions');

        if (DataSourceUtil.isProjectSelectorNotNeeded(context)) {
            return dimensionsInConfig;
        }

        var schemaId = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'DimensionsForSurveysSchemaId');
        var tableName = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'DimensionsForSurveysTable');

        if (schemaId && tableName) { // there is storage for baby survey dimensions

            var schema: DBDesignerSchema = context.confirmit.GetDBDesignerSchema(schemaId);
            var table: DBDesignerTable = schema.GetDBDesignerTable(tableName);
            var selectedProjects = ParamUtil.GetSelectedCodes(context, 'p_projectSelector');
            var activeDimesions = [];

            for (var i = 0; i < selectedProjects.length; i++) {
                activeDimesions = activeDimesions.concat(getActiveCategorizationsForPulseSurvey(context, table, selectedProjects[i]));
            }

            if (activeDimesions.length > 0) {
                return ArrayUtil.removeDuplicatesFromArray(activeDimesions);
            }

        }

        return dimensionsInConfig;
    }

    /**
     * Add custom statement questions as table rows based on Question category
     *  @param {object} context: {state: state, report: report, log: log, table: table}
     *  @param {boolean} isNormalizedTable: true for table for normalized questions
     */

    static function tableStatements_AddRows_Banner2(context, isNormalizedTable) {

        var report = context.report;
        var state = context.state;
        var table = context.table;
        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        var isDimensionVisible = state.Parameters.GetString('p_Results_TableTabSwitcher') !== 'noDims'
        // display a categorisation object as a dimension
        if (isDimensionVisible && !DataSourceUtil.isProjectSelectorNotNeeded(context)) {
            var categorization: HeaderCategorization = new HeaderCategorization();
            categorization.CategorizationId = 'Custom';
            categorization.DataSourceNodeId = DataSourceUtil.getDsId(context);
            categorization.Collapsed = true;
            categorization.Totals = true;
            TableUtil.addBreakByNestedHeader(context, categorization);
            table.RowHeaders.Add(categorization);
        }

        var custom_category = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'CustomStatementCategory');
        var custom_questions = QuestionUtil.getQuestionsByCategory(context, custom_category);

        for (var i = 0; i < custom_questions.length; i++) {
            var qId = custom_questions[i].QuestionId;
            var questionnaireElement: QuestionnaireElement = QuestionUtil.getQuestionnaireElement(context, qId);
            var headerQuestion: HeaderQuestion = new HeaderQuestion(questionnaireElement);
            headerQuestion.IsCollapsed = true;
            headerQuestion.HideHeader = true;
            TableUtil.addBreakByNestedHeader(context, headerQuestion);

            var dummyHeader: HeaderSegment = new HeaderSegment();
            dummyHeader.DataSourceNodeId = DataSourceUtil.getDsId(context);
            dummyHeader.SegmentType = HeaderSegmentType.Expression;
            dummyHeader.Expression = Filters.projectSelectorInPulseProgram(context);
            dummyHeader.Label = new Label(report.CurrentLanguage, QuestionUtil.getCustomQuestionTextById(context, qId));
            dummyHeader.HideData = false;
            dummyHeader.SubHeaders.Add(headerQuestion);

            table.RowHeaders.Add(dummyHeader);
        }
    }

    /**
     * Add set of columns: Score, distribution barChart, Scale Distribution, Responses, Benchmarks, Benchmark comparison bar chart, hierarchy comparison columns
     * @param {object} context: {state: state, report: report, log: log, table: table}
     * @param {string} scoreType
     * @param {boolean} isNormalizedTable: true for table for normalized questions
     */

    static function tableStatements_AddColumns_Banner0(context, isNormalizedTable) {

        var log = context.log;

        // add Score column
        //addScore(context);
        var scoreHeader: HeaderContent = new HeaderContent();
        context.table.ColumnHeaders.Add(scoreHeader);

        if (!isNormalizedTable) {
            //add distribution barChart
            addDistributionBarChart(context);
            // add scale distribution
            addScaleDistributionColumns(context);
        }
        // add Responses Column
        addResponsesColumn(context);
        // add Benchmark related columns
        tableStatements_AddBenchmarkColumns_Banner0(context, isNormalizedTable);
    }

    /**
     * Add Score calculation
     * @param {object} context: {state: state, report: report, log: log, table: table}
     * @param {string} scoreType: 'avg', '%fav', '%fav-%unfav'
     * @param {Header} parentHeader - not mandotary
     * @param {Array} [Header1, Header2,...]
     */
    static function addScore(context, parentHeader) {

        var table = context.table;
        var state = context.state;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var scoreType = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'ScoreType');
        var suppressSettings = context.suppressSettings;
        var suppressValue = suppressSettings.minBase || SuppressConfig.TableSuppressValue;

        var posScoreRecodingCols = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecoding_PositiveCols');
        var negScoreRecodingCols = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecoding_NegativeCols');

        //Create separate responses column to be able to check it independently
        //var scoreResponses = getResponsesColumn(context, true);

        scoreType = scoreType.toLowerCase();

        if (scoreType === 'avg') {

            // add Score column
            var avg: HeaderFormula = new HeaderFormula();
            avg.Type = FormulaType.Expression;
            avg.Expression = 'cellv(col+1, row)';//avg.Expression = 'if(cellv(col-1,row) = emptyv() OR ROUND(cellv(col-1,row), '+Config.Decimal+') < ' + suppressValue + ', emptyv(), cellv(col+1,row))';
            avg.Decimals = Config.Decimal;
            avg.Title = TextAndParameterUtil.getLabelByKey(context, 'Score');

            var score: HeaderStatistics = new HeaderStatistics();
            score.Decimals = Config.Decimal;
            score.Statistics.Avg = true;
            score.HideData = true;
            //score.Texts.Average = TextAndParameterUtil.getLabelByKey(context, 'Score');

            if (parentHeader) {
                //parentHeader.SubHeaders.Add(scoreResponses);
                parentHeader.SubHeaders.Add(avg);
                parentHeader.SubHeaders.Add(score);
            } else {
                //table.ColumnHeaders.Add(scoreResponses);
                table.ColumnHeaders.Add(avg);
                table.ColumnHeaders.Add(score);
            }
            return [avg, score]; // TO DO: revise, this is cruntch to align avg with other types of scores which consits of 2 cols
        }

        var bcCategories: HeaderCategories = new HeaderCategories();
        //bcCategories.RecodingShowOriginal = true;
        //bcCategories.RecodingPosition = RecodingPositionType.OnStart;
        if (scoreType === '%fav') {

            // add Score column
            var fav: HeaderFormula = new HeaderFormula();
            fav.Type = FormulaType.Expression;
            fav.Expression = 'cellv(col+'+posScoreRecodingCols.join(', row)+cellv(col+')+',row)';//fav.Expression = 'if(cellv(col-1,row) = emptyv() OR ROUND(cellv(col-1,row), '+Config.Decimal+') < ' + suppressValue + ', emptyv(), cellv(col+'+posScoreRecodingCols.join(', row)+cellv(col+')+',row))';
            fav.Decimals = Config.Decimal;
            fav.Title = TextAndParameterUtil.getLabelByKey(context, 'Fav');

            //add distribution barChart
            bcCategories.RecodingIdent = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecodingId');
            bcCategories.Totals = false;
            bcCategories.Distributions.Enabled = true;
            bcCategories.Distributions.HorizontalPercents = true;
            bcCategories.Decimals = Config.Decimal;
            bcCategories.HideData = true;

            if (parentHeader) {
                //parentHeader.SubHeaders.Add(scoreResponses);
                parentHeader.SubHeaders.Add(fav);
                parentHeader.SubHeaders.Add(bcCategories);
            } else {
                //table.ColumnHeaders.Add(scoreResponses);
                table.ColumnHeaders.Add(fav);
                table.ColumnHeaders.Add(bcCategories);
            }
            return [fav, bcCategories];
        }

        if (scoreType === '%fav-%unfav') {

            // add Score column
            var diff: HeaderFormula = new HeaderFormula();
            diff.Type = FormulaType.Expression;
            diff.Expression = 'cellv(col+'+posScoreRecodingCols.join(', row)+cellv(col+')+',row) - cellv(col+'+negScoreRecodingCols.join(', row)-cellv(col+')+',row)';
            //diff.Expression = 'if(cellv(col-1,row) = emptyv() OR ROUND(cellv(col-1,row), '+Config.Decimal+') < ' + suppressValue + ', emptyv(), cellv(col+'+posScoreRecodingCols.join(', row)+cellv(col+')+',row) - cellv(col+'+negScoreRecodingCols.join(', row)-cellv(col+')+',row))';
            diff.Decimals = Config.Decimal;
            diff.Title = TextAndParameterUtil.getLabelByKey(context, 'FavMinUnfav');

            //add distribution barChart
            bcCategories.RecodingIdent = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecodingId');
            bcCategories.Totals = false;
            bcCategories.Distributions.Enabled = true;
            bcCategories.Distributions.HorizontalPercents = true;
            bcCategories.Decimals = Config.Decimal;
            bcCategories.HideData = true;

            if (parentHeader) {
                //parentHeader.SubHeaders.Add(scoreResponses);
                parentHeader.SubHeaders.Add(diff);
                parentHeader.SubHeaders.Add(bcCategories);
            } else {
                //table.ColumnHeaders.Add(scoreResponses);
                table.ColumnHeaders.Add(diff);
                table.ColumnHeaders.Add(bcCategories);
            }
            return [diff, bcCategories];
        }

        throw new Error('PageResults.addScore: Calculation of score for type "' + scoreType + ' is not found."');
    }

    /**
     *  add distribution bar chart
     *  @param {object} context: {state: state, report: report, log: log, table: table}
     */
    static function addDistributionBarChart(context) {

        var log = context.log;
        var table = context.table;
        var state = context.state;

        //add distribution barChart
        var bcCategories: HeaderCategories = new HeaderCategories();
        bcCategories.RecodingIdent = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecodingId');
        bcCategories.Totals = false;
        bcCategories.Distributions.Enabled = true;
        bcCategories.Distributions.HorizontalPercents = true;
        bcCategories.Decimals = Config.Decimal;
        bcCategories.HideData = true;

        table.ColumnHeaders.Add(bcCategories);

        var barChartColors = Config.barChartColors_Distribution;
        var n = barChartColors.length;

        if (state.ReportExecutionMode !== ReportExecutionMode.ExcelExport) {

            var barChart: HeaderChartCombo = new HeaderChartCombo();
            var chartValues = [];
            var i;

            bcCategories.HideData = true;

            for (i = 0; i < n; i++) {
                var chartValue: ChartComboValue = new ChartComboValue();
                chartValue.Expression = 'cellv(col-' + (i + 1) + ', row)'; //'cellv(col-'+(n-i)+', row)';//
                chartValue.BaseColor = new ChartComboColorSet([barChartColors[i].color]);
                chartValue.Name = TextAndParameterUtil.getTextTranslationByKey(context, barChartColors[i].label);
                chartValue.CssClass = 'barchart__bar barchart__bar_type_distribution ' + barChartColors[i].type;
                chartValues.push(chartValue);
            }

            barChart.Values = chartValues;
            barChart.TypeOfChart = ChartComboType.Bar100;
            barChart.Title = TextAndParameterUtil.getLabelByKey(context, 'Distribution');
            table.ColumnHeaders.Add(barChart);
        } else {
            //workaround for Excel export that shows recording (not chart) and takes translations from recording
            //so show formula instead of original recording

            for (i = 0; i < barChartColors.length; i++) {
                var formula: HeaderFormula = new HeaderFormula();
                formula.Type = FormulaType.Expression;
                formula.Expression = 'cellv(col-' + (i * 2 + 1) + ', row)/100';
                formula.Percent = true;
                formula.Title = TextAndParameterUtil.getLabelByKey(context, barChartColors[i].label);
                table.ColumnHeaders.Add(formula);
            }
        }
    }

    /**
     *  add scale distribution columns
     *  @param {object} context: {state: state, report: report, log: log, table: table}
     */
    static function addScaleDistributionColumns(context) {

        var state = context.state;
        var table = context.table;

        // add scale distribution
        if (!state.Parameters.IsNull('p_Results_CountsPercents')) {

            var selectedDistr = state.Parameters.GetString('p_Results_CountsPercents');
            var categoryDistr: HeaderCategories = new HeaderCategories();
            var baseDist: HeaderBase = new HeaderBase();

            categoryDistr.Totals = false;
            baseDist.Distributions.Enabled = true;
            baseDist.Decimals = Config.Decimal;
            baseDist.HideHeader = true;

            if (selectedDistr === 'C') { // Counts

                baseDist.Distributions.Count = true;
                baseDist.Distributions.HorizontalPercents = false;
            } else { // Percent

                baseDist.Distributions.HorizontalPercents = true;
                baseDist.Distributions.Count = false;
            }

            TableUtil.maskOutNA(context, categoryDistr);

            categoryDistr.SubHeaders.Add(baseDist);
            table.ColumnHeaders.Add(categoryDistr);
        }
    }

    /**
     *  add base column
     *  @param {object} context: {state: state, report: report, log: log, table: table}
     *  @param {Header} parentHeader - not mandatory
     */
    static function addResponsesColumn(context, parentHeader, isMandatory) {

        var state = context.state;
        // add Responses Column if it's not Excel export (KN-353)
        if (!isMandatory && state.ReportExecutionMode === ReportExecutionMode.ExcelExport) {
            return;
        }
        var table = context.table;

        // add Responses Column
        var responses = getResponsesColumn(context);

        if (parentHeader) {
            parentHeader.SubHeaders.Add(responses);
        } else {
            table.ColumnHeaders.Add(responses);
        }
    }

    /**
     *  create base column
     *  @param {object} context: {state: state, report: report, log: log, table: table}
     *  @param {boolean} isHidden - not mandatory
     */
    static function getResponsesColumn(context, isHidden) {

        var table = context.table;

        // add Responses Column
        var responses: HeaderBase = new HeaderBase();
        var catForMask: HeaderCategories = new HeaderCategories();

        catForMask.HideHeader = true;
        catForMask.HideData = isHidden;
        TableUtil.maskOutNA(context, catForMask);

        catForMask.Mask.Type = MaskType.ShowCodes;
        catForMask.Mask.Codes = ''; // do not show any codes but Total
        responses.SubHeaders.Add(catForMask);

        responses.HideHeader = isHidden;
        responses.HideData = isHidden;

        return responses;
    }

    /**
     * copies values of column #bmColumn from Benchmarks table into targetHeader of another table
     * @param {Object} context
     * @param {Datapoint[]} - base values for main table where we copy data to
     * @param {Number} column of Benchmark table to copy vals from (1-based)
     * @param {HeaderContent} header content that recieves values
     * @param {String} header content title
     * @param {boolean} isNormalizedTable: true for table for normalized questions
     */
        //TODO: unify with copyScoreValues below
    static function copyBenchmarkValues(context, baseValuesForOriginalScores, bmColumn, targetHeader, title, isNormalizedTable) {

        var report = context.report;
        var log = context.log;
        var table = context.table;
        var benchmarkTable = (isNormalizedTable) ? "BenchmarksNorm": "Benchmarks";
        var bmValues: Datapoint[] = report.TableUtils.GetColumnValues(benchmarkTable, bmColumn);
        var suppressValue = SuppressConfig.TableSuppressValue;
        var baseValues: Datapoint[] = (!baseValuesForOriginalScores) ? report.TableUtils.GetColumnValues(benchmarkTable, 1) : baseValuesForOriginalScores;


        for (var i = 0; i < bmValues.length; i++) {

            if (baseValues[i].Value >= suppressValue && ! bmValues[i].IsEmpty) {
                targetHeader.SetCellValue(i,  bmValues[i].Value);
            }
        }

        targetHeader.Title = new Label(report.CurrentLanguage, title);
        table.ColumnHeaders.Add(targetHeader);

    }

    /**
     * returns number of answers in break by question
     * @param {Object} context
     * @returns {Number} number of sub-rows
     */
    static function getNumberOfSubHeaderRows(context) {

        if(context.state.Parameters.IsNull('p_Results_BreakBy')) {
            return 0;
        }

        var qid = ParamUtil.GetSelectedCodes(context, 'p_Results_BreakBy');
        var questionInfo = QuestionUtil.getQuestionInfo(context, qid);
        var subHeaders;

        if(questionInfo.standardType === 'hierarchy') {
            subHeaders = HierarchyUtil.getDirectChildrenForCurrentReportBase(context);
        } else {
            subHeaders = QuestionUtil.getQuestionAnswers(context, qid);
        }

        return subHeaders.length;
    }

    /**
     * if all questions inside dimension will be suppressed -> dimension must be suppressed
     * -> don't move score value to statements table
     * @param {Object} context
     * @param {Number} dimensionStartRow - number of 1st row of dimension
     * @param {Object} dimensionsInfoObject - holds info if dimension is suppressed or not to avoid recalculation for every row
     * @param {StringCollection} rowHeaderInfo - row headers of benchmark table, report.TableUtils.GetRowHeaderCategoryIds(benchmarkTable);
     * @param {DataPont[]} - baseValues 1st column of Benchmarh table
     * @param {Nimber} numOfSubheaders - number of the subheaders for the dimension
     * @returns {Boolean} - if dimension is suppressed or not
     */
    static function isDimensionSuppressed(context, dimensionStartRow, dimensionsInfoObject, rowHeaderInfo, baseValues, numOfSubheaders) {

        if(!dimensionsInfoObject.hasOwnProperty(dimensionStartRow)) {

            var numOfSubHeaders = numOfSubheaders;
            var rowNum = (numOfSubHeaders>0) ? dimensionStartRow+numOfSubHeaders : dimensionStartRow+1; //jump to not total's rows
            var isDimensionEmpty = true;
            var suppressValue = SuppressConfig.TableSuppressValue;

            while(isDimensionEmpty && rowNum<=baseValues.length-1) {

                var nextRowHeader = rowHeaderInfo[rowNum];
                //next dimension started
                if(nextRowHeader[nextRowHeader.length - 1] === "") {
                    break;
                }

                if(!baseValues[rowNum].IsEmpty && baseValues[rowNum].Value >= suppressValue) {
                    isDimensionEmpty = false;
                }
                rowNum = (numOfSubHeaders > 0) ? rowNum + numOfSubHeaders : rowNum + 1;
            }
            dimensionsInfoObject[dimensionStartRow] = isDimensionEmpty;
        }

        return dimensionsInfoObject[dimensionStartRow];
    }

    /**
     *
     * @param {Object} context
     * @param {StringCollection} rowHeaderInfo - row headers of benchmark table, report.TableUtils.GetRowHeaderCategoryIds(benchmarkTable);
     * @param {Number} - row index
     * @returns {Boolean} - if row is a question or dimension's total
     */
    static function isQuestionHeader(context, rowHeaderInfo, rowIndex) {

        var tabSwitcher = ParamUtil.GetSelectedCodes(context, 'p_Results_TableTabSwitcher');
        if (tabSwitcher[0] === 'custom') {
            return true; //there are no dimensions on custom tab
        }

        var currentRowInfo = rowHeaderInfo[rowIndex];
        var currentRowId = currentRowInfo[currentRowInfo.length -1];

        if(!Export.isExcelExportMode(context)) { // in web and pdf
            return currentRowId !== "";
        }

        if(currentRowId !== "") {
            return true;
        }

        //excel export and id is empty: either dimension header or custom question header
        var pageId = PageUtil.getCurrentPageIdInConfig(context)
        var custom_category = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'CustomStatementCategory');
        var custom_questions = QuestionUtil.getQuestionsByCategory(context, custom_category);

        return rowIndex > rowHeaderInfo.length - custom_questions.length;

    }

    /**
     * copies values of column #bmColumn from Benchmarks table into targetHeader of another table
     * @param {Object} context
     * @param {Datapoint[]} - base values for main table where we copy data to
     * @param {Number} column of Benchmark table to copy vals from (1-based)
     * @param {HeaderContent} header content that recieves values
     * @param {String} header content title
     * @param {boolean} isNormalizedTable: true for table for normalized questions
     */
    static function copyScoreValues(context, baseValuesForOriginalScores, bmColumn, targetHeader, title, isNormalizedTable) {

        var report = context.report;
        var log = context.log;
        var benchmarkTable = (isNormalizedTable) ? "BenchmarksNorm": "Benchmarks";
        var bmValues: Datapoint[] = report.TableUtils.GetColumnValues(benchmarkTable, bmColumn);
        var suppressValue = SuppressConfig.TableSuppressValue;
        var baseValues: Datapoint[] = (!baseValuesForOriginalScores) ? report.TableUtils.GetColumnValues(benchmarkTable, 1) : baseValuesForOriginalScores;

        var numOfSubheaders = getNumberOfSubHeaderRows(context);

        var rowHeaderInfo = report.TableUtils.GetRowHeaderCategoryIds(benchmarkTable);
        var dimensionsInfoObject = {};

        for (var i = 0; i < bmValues.length; i++) {

            //log.LogDebug('------------------------------------');
            var isDimensionHeader = !isQuestionHeader(context, rowHeaderInfo, i);
            var isDimensionNotSuppressed = isDimensionHeader && !isDimensionSuppressed(context, i, dimensionsInfoObject, rowHeaderInfo, baseValues, numOfSubheaders);

            //log.LogDebug('i='+i+' current row='+JSON.stringify(rowHeaderInfo[i])+' isDimensionHeader='+isDimensionHeader+' isDimensionNotSuppressed='+isDimensionNotSuppressed+' baseValues[i].Value='+baseValues[i].Value);

            if (isDimensionNotSuppressed || (!isDimensionHeader && baseValues[i].Value >= suppressValue)) {
                if(!bmValues[i].IsEmpty) targetHeader.SetCellValue(i, bmValues[i].Value);
            }
            //log.LogDebug('------------------------------------');
        }

        targetHeader.Title = new Label(report.CurrentLanguage, title);

    }

    /*
  * Add set of benchmark related set of columns: Benchmarks, Benchmark comparison bar chart
  * @param {object} context: {state: state, report: report, log: log, table: table}
  * @param {boolean} isNormalizedTable: true for table for normalized questions
  */
    static function tableStatements_AddBenchmarkColumns_Banner0(context, isNormalizedTable) {

        var log = context.log;

        var report = context.report;
        var table = context.table;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var bmColumn = 2; // 1st coulumn always exists - it's base, then score value
        var benchmarkTable = (isNormalizedTable) ? "BenchmarksNorm": "Benchmarks";
        var baseValues: Datapoint[] = report.TableUtils.GetColumnValues(benchmarkTable, 1);
        var suppressValue = SuppressConfig.TableSuppressValue;
        var benchmarkTableLabels = report.TableUtils.GetColumnHeaderCategoryTitles(benchmarkTable);
        var base: Datapoint;
        // !!!order of how bm cols are added must comply with bm table column order!!!

        //copy Score value
        var scoreHeader: HeaderContent = table.ColumnHeaders[0];
        copyScoreValues(context, baseValues, bmColumn, scoreHeader, benchmarkTableLabels[bmColumn - 1], isNormalizedTable);
        bmColumn += 1;

        // previous wave benchmark
        var showPrevWave = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'showPrevWave');
        if (showPrevWave) {
            // add values
            var waveHeader: HeaderContent = new HeaderContent();

            //TO DO: replace with copyBenchmarkValues(context, bmColumn, targetHeader, benchmarkTableLabels[bmColumn - 1], isNormalizedTable);
            var preWaveVals: Datapoint[] = report.TableUtils.GetColumnValues(benchmarkTable, bmColumn);
            waveHeader.HideData = true;
            for (var j = 0; j < preWaveVals.length; j++) {

                var prevWaveVal: Datapoint = preWaveVals[j];
                base = baseValues[j];

                if (base.Value >= suppressValue && !prevWaveVal.IsEmpty) {
                    waveHeader.SetCellValue(j, prevWaveVal.Value);
                } else if (base.Value >= suppressValue) {
                    waveHeader.SetCellValue(j, '-');
                }
            }
            table.ColumnHeaders.Add(waveHeader);

            addScoreVsBenchmarkChart(context, 'col-1', 'ScoreVsPrevWave');
            bmColumn += 1;
        }

        //add survey comparison score
        var tabSwitcher = ParamUtil.GetSelectedCodes(context, 'p_Results_TableTabSwitcher');
        if (tabSwitcher[0] !== 'custom') {

            /*var surveyCompCols = getBenchmarkSurveys(context);
            for (i = 0; i < surveyCompCols.length; i++) {
                var surveyCompContent: HeaderContent = new HeaderContent();
                copyBenchmarkValues(context, baseValues, bmColumn, surveyCompContent, benchmarkTableLabels[bmColumn - 1], isNormalizedTable);
                bmColumn += 1;
            }*/

            var projectsToCompare = ParamUtil.GetSelectedCodes(context, 'p_Results_ComparisonSurveys');

            if(projectsToCompare.length > 0) {
                var surveyCompContent: HeaderContent = new HeaderContent();
                copyBenchmarkValues(context, baseValues, bmColumn, surveyCompContent, benchmarkTableLabels[bmColumn - 1], isNormalizedTable);
                bmColumn += 1;
            }
        }

        // add benchmark data based on benchmark project
        if (DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkProject')) {

            var benchmarkContent: HeaderContent = new HeaderContent();
            copyBenchmarkValues(context, baseValues, bmColumn, benchmarkContent, benchmarkTableLabels[bmColumn - 1], isNormalizedTable);
            benchmarkContent.HideData = true;
            addScoreVsBenchmarkChart(context, 'col-1', 'ScoreVsNormValue');
            bmColumn += 1;
        }

        //add hierarchy comparison benchmarks
        var reportBases = !!DataSourceUtil.getSurveyPropertyValueFromConfig (context, 'HierarchyQuestion') && context.user.PersonalizedReportBase.split(',');
        var breakByType = TableUtil.getBreakByType().toLowerCase();

        //do not show hierarchy columns if break by is by hierarchy
        if (breakByType !== 'hierarchy') {

            var hierCompCols = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'HierarchyBasedComparisons');

            for (var i = 0; i < hierCompCols.length; i++) {

                var toCopy;

                //show top columns if there are >= 1 nodes selected
                //show other hierarchy columns only if 1 node selected
                if(hierCompCols[i] === 'top') {
                    toCopy = true;
                } else {
                    if(reportBases.length === 1) {
                        toCopy = true;

                        if(hierCompCols[i] === 'company-total') {
                            var companyTotals = HierarchyUtil.getReferencedNodeValuesForCurrentReportBase(context, Config.companyTotalField);
                            if(!(companyTotals && companyTotals.length === 1) || reportBases[0] === HierarchyUtil.getTopNode(context)) {
                                toCopy = false;
                                bmColumn--;
                            }
                        }
                    } else {
                        toCopy = false;
                    }
                }

                if(toCopy) {
                    var hierCompContent: HeaderContent = new HeaderContent();
                    copyBenchmarkValues(context, baseValues, bmColumn, hierCompContent, benchmarkTableLabels[bmColumn - 1], isNormalizedTable);
                    bmColumn += 1;
                }
            }

        }

    }

    /**
     * create comparison barchart header: i.e. diff between current stat value and norm
     * @param {object} context: {state: state, report: report, log: log, table: table}
     * @param {string} expression - how to calc value
     * @param {string} labelKey - defines chart label
     */
    static function addScoreVsBenchmarkChart(context, normColPosition, labelKey) {

        var report = context.report;
        var state = context.state;
        var table = context.table;
        var barChart_ScoreVsNorm: HeaderChartCombo = new HeaderChartCombo();
        var chartValue_ScoreVsNorm = [];
        var barChart_ScoreVsNormColors = Config.barChartColors_NormVsScore;

        // add formula to calculate score vs. prev wave
        var formula_ScoreVsPrevNorm: HeaderFormula = new HeaderFormula();
        formula_ScoreVsPrevNorm.Type = FormulaType.Expression;
        formula_ScoreVsPrevNorm.Expression = 'if(cellv('+normColPosition+', row)==emptyv(),emptyv(),if((cellv(1,row)-cellv(' + normColPosition + ',row) < 1 AND (cellv(1,row)-cellv(' + normColPosition + ',row) > -1)), 0, cellv(1,row)-cellv(' + normColPosition + ',row)))'; // the 1st column in the table is score
        table.ColumnHeaders.Add(formula_ScoreVsPrevNorm);

        // add barchart
        if (state.ReportExecutionMode !== ReportExecutionMode.ExcelExport) {

            barChart_ScoreVsNorm.TypeOfChart = ChartComboType.Bar;
            barChart_ScoreVsNorm.Thickness = '100%';
            barChart_ScoreVsNorm.Size = 200;
            barChart_ScoreVsNorm.HideHeader = true;

            var chartValue_Main: ChartComboValue = new ChartComboValue();

            // diff between score and norm value, always previous column (formula)
            // hack: if diff is 0 or undefined bar chart will not render
            // therefore we set value to -1, when value is 0 and than js+css will
            // 1) work with rendered barchart,
            // 2) check real value in cell to the left (set attributes with diff value from formula)
            // 3) add proper value to barchart and hide "-1" barchart
            chartValue_Main.Expression = 'if(cellv(col-1,row) != 0 , cellv(col-1,row), -1)';
            chartValue_Main.BaseColor = new ChartComboColorSet([barChart_ScoreVsNormColors[1].color]); // main color is red - negative
            chartValue_Main.CssClass = 'barchart__bar barchart__bar_type_score-vs-norm';

            var chartValue_Alternative: ChartComboColorAlternative = new ChartComboColorAlternative();
            chartValue_Alternative.Color = new ChartComboColorSet([barChart_ScoreVsNormColors[0].color]);
            chartValue_Alternative.Threshold = 1; // If greater than 0

            chartValue_Main.AltColors = [chartValue_Alternative];
            chartValue_ScoreVsNorm.push(chartValue_Main);

            barChart_ScoreVsNorm.Values = chartValue_ScoreVsNorm;
            barChart_ScoreVsNorm.Title = new Label(report.CurrentLanguage, TextAndParameterUtil.getTextTranslationByKey(context, labelKey));

            table.ColumnHeaders.Add(barChart_ScoreVsNorm);

        } else {
            formula_ScoreVsPrevNorm.Title = TextAndParameterUtil.getLabelByKey(context, labelKey);
        }

    }

    /*
  * Conditional Formatting for Statements table
  * @param {object} context: {state: state, report: report, log: log, table: table}
  */
    static function tableStatements_ApplyConditionalFormatting(context) {

        var table = context.table;
        var log = context.log;

        // Score column is bold and has bigger font-size
        var area: Area = new Area();
        var score: Condition = new Condition();
        score.Expression = 'col==1';
        score.Style = 'score-column cf-score-column';

        area.Name = 'Score';
        area.FromStart = true;
        area.Indexes = '1';
        area.RowFormatting = false;
        area.AddCondition(score);

        table.ConditionalFormatting.AddArea(area);

    }

    /*
  * show distribution bar chart legend
  * @param {object} context {state: state, report: report, log: log, text: text}
  */
    static function drawDistributionChartLegend(context) {

        var text = context.text;
        var barChartColors = Config.barChartColors_Distribution;
        var legend = '<div class="bar-chart-legend-container"><div class="bar-chart-legend">';

        for (var i = 0; i < barChartColors.length; i++) {
            legend += '<div class="bar-chart-legend__item legend-item">' + '<div class="legend-item__color" style="background-color: ' + barChartColors[i].color + ';"></div>' + '<div class="legend-item__label">' + TextAndParameterUtil.getTextTranslationByKey(context, barChartColors[i].label) + '</div>' + '</div>';
        }

        legend += '</div></div>';
        text.Output.Append(legend);

        return;
    }

    //-----------------------------------------------------------------------------------------------

    /*
  * Assemble Benchmarks table
  * @param {object} context: {state: state, report: report, log: log, table: table}
  * @param {boolean} isNormalizedTable: true for table for normalized questions
  */

    static function tableBenchmarks_Render(context, isNormalizedTable) {

        var table = context.table;
        var log = context.log;

        tableStatements_AddRows(context, isNormalizedTable);
        tableBenchmarks_AddColumns_Banner0(context, isNormalizedTable);
        SuppressUtil.setTableSuppress(table, context.suppressSettings);

        table.Decimals = Config.Decimal;
        table.RowNesting = TableRowNestingType.Nesting;
        table.RemoveEmptyHeaders.Rows = false;
        table.Caching.Enabled = false;
    }

    /*
  * Populate benchmarks table
  * @param {object} context: {state: state, report: report, log: log, table: table, user: user}
  * @param {boolean} isNormalizedTable: true for table for normalized questions
  */
    static function tableBenchmarks_AddColumns_Banner0(context, isNormalizedTable) {

        var table = context.table;
        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        var excludedFiltersExpression = Filters.getFilterForBenchmarkTableColumns(context);


        // add Responses Column
        var excludedFiltersForN: HeaderSegment = new HeaderSegment();
        excludedFiltersForN.DataSourceNodeId = DataSourceUtil.getDsId(context);
        excludedFiltersForN.SegmentType = HeaderSegmentType.Expression;
        excludedFiltersForN.Expression = excludedFiltersExpression;
        excludedFiltersForN.HideHeader = true;

        addResponsesColumn(context, excludedFiltersForN, true);
        table.ColumnHeaders.Add(excludedFiltersForN);

        //if the table is normalized and no normalized qs specified don't add other columns
        if(isNormalizedTable && !anyNormalizedQuestions(context)) {
            return;
        }

        //add Score column
        //addScore(context, excludedFiltersForN);
        var scoreHeaders = addScore(context); // first add header and below segment because otherwise scripted table gives wrong results
        var excludedFiltersForScore: HeaderSegment = new HeaderSegment();

        excludedFiltersForScore.DataSourceNodeId = DataSourceUtil.getDsId(context);
        excludedFiltersForScore.SegmentType = HeaderSegmentType.Expression;
        excludedFiltersForScore.HideData = true;
        excludedFiltersForScore.Expression = excludedFiltersExpression;
        scoreHeaders[1].SubHeaders.Add(excludedFiltersForScore);

        //add previous wave column
        if (DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'showPrevWave')) {
            tableBenchmarks_addWaveScoreColumn(context);
        }

        //add survey based comparison
        var tabSwitcher = ParamUtil.GetSelectedCodes(context, 'p_Results_TableTabSwitcher');
        if (tabSwitcher[0] !== 'custom') {
            tableBenchmarks_addTrackerBasedComparison(context);
        }

        //add Benchmarks from benchmark project
        if (DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkProject')) {

            var benchmarks: HeaderBenchmark = new HeaderBenchmark();
            benchmarks.BenchmarkProjectId = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkProject');

            var bmSet = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkSet');

            if (bmSet && bmSet.length>0) { // there's benchmark set
                var selectedBMSet = ParamUtil.GetSelectedCodes(context, 'p_BenchmarkSet'); // can be only one option
                benchmarks.BenchmarkSet = selectedBMSet[0];
            }
            table.ColumnHeaders.Add(benchmarks);
        }

        //add Benchmark as comparison to upper hierarchy levels
        var bases = !!DataSourceUtil.getSurveyPropertyValueFromConfig (context, 'HierarchyQuestion') && context.user.PersonalizedReportBase.split(',');
        var breakByType = TableUtil.getBreakByType().toLowerCase();

        //do not show hierarchy columns if there are > 1 nodes selected or break by is by hierarchy
        if (bases && breakByType !== 'hierarchy') {
            var hierarchyLevelsToCompare = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'HierarchyBasedComparisons');

            for (var i = 0; i < hierarchyLevelsToCompare.length; i++) {
                var isHierarchyColumnToBeAdded;

                if(hierarchyLevelsToCompare[i] === 'top') {
                    isHierarchyColumnToBeAdded = true;
                } else {
                    isHierarchyColumnToBeAdded = (bases.length === 1);
                }

                if(isHierarchyColumnToBeAdded) {
                    tableBenchmarks_addHierarchyBasedComparison(context, hierarchyLevelsToCompare[i]);
                }
            }
        }
    }

    /*
  * Adds segment with proper filter by hierarchy and base and score column for it
  * @param {object} context: {state: state, report: report, log: log, table: table, user: user}
  * @param {level} top or number of levels to go up
  */
    static function tableBenchmarks_addHierarchyBasedComparison(context, level) {

        var log = context.log;
        var report = context.report;

        var levelSegment: HeaderSegment = new HeaderSegment();
        levelSegment.DataSourceNodeId = DataSourceUtil.getDsId(context);
        levelSegment.SegmentType = HeaderSegmentType.Expression;
        levelSegment.HideData = true;

        if (level === 'company-total') {
            var companyTotalField = Config.companyTotalField;

            if(companyTotalField && companyTotalField.length > 0) {
                var companyTotals = HierarchyUtil.getReferencedNodeValuesForCurrentReportBase(context, companyTotalField);

                if(companyTotals && companyTotals.length === 1) {
                    levelSegment.Expression = Filters.getFilterForBenchmarkTableColumns(context, companyTotals[0]['id'], null, null, true);
                    levelSegment.Label = new Label(report.CurrentLanguage, companyTotals[0]['label']);
                } else {
                    return ;
                }
            } else {
                throw new Error("PageResults.tableBenchmarks_addHierarchyBasedComparison: No company total field specified in the Config.")
            }

        } else {
            var parentsList = [];

            if (level === 'top') {
                parentsList = HierarchyUtil.getParentsForCurrentHierarchyNode(context);
            } else if (level === 'parent') {
                parentsList = HierarchyUtil.getParentsForCurrentHierarchyNode(context, 1);
            } else {
                parentsList = HierarchyUtil.getParentsForCurrentHierarchyNode(context, Number(level));
            }

            if (parentsList && (parentsList.length === 1 || (parentsList.length > 1 && level === 'top')) && parentsList[0].length > 0) { //===1 for multiselect hierarchy
                var parentArr = parentsList[0];
                var index = parentArr.length - 1;

                levelSegment.Expression = Filters.getFilterForBenchmarkTableColumns(context, parentArr[index]['id'], null, null, true);
                levelSegment.Label = new Label(report.CurrentLanguage, parentArr[index]['label']);

            } else {
                return; // no such parent in the hierarchy
            }
        }

        //calc score
        var newHeaders = addScore(context);
        newHeaders[0].Title = levelSegment.Label; // first add header and below segment because otherwise scripted table gives wrong results
        newHeaders[1].SubHeaders.Add(levelSegment);

    }

    /*
  * Adds segment with proper filter by survey
  * @param {object} context: {state: state, report: report, log: log, table: table, user: user}
  * @param {string} survey - project id
  */
    static function tableBenchmarks_addSurveyBasedComparison(context, survey) {

        //var log = context.log;
        var report = context.report;
        var surveySegment: HeaderSegment = new HeaderSegment();

        surveySegment.DataSourceNodeId = DataSourceUtil.getDsId(context);
        surveySegment.SegmentType = HeaderSegmentType.Expression;
        surveySegment.HideData = true;
        surveySegment.Expression = Filters.getFilterForBenchmarkTableColumns(context, null, null, survey.Code, true);

        surveySegment.Label = new Label(report.CurrentLanguage, survey.Label);
        //calc score
        var newHeaders = addScore(context);
        newHeaders[0].Title = surveySegment.Label; // first add header and below segment because otherwise scripted table gives wrong results
        newHeaders[1].SubHeaders.Add(surveySegment);
    }

    /*
     * Adds segment with the filter based on the selected tracker surveys
     * @param {object} context: {state: state, report: report, log: log, table: table, user: user}
     */
    static function tableBenchmarks_addTrackerBasedComparison(context) {

        var log = context.log;
        var report = context.report;

        if(!DataSourceUtil.isProjectSelectorNotNeeded(context)) {
            var projectsToCompare = ParamUtil.GetSelectedCodes(context, 'p_Results_ComparisonSurveys');

            if(projectsToCompare.length > 0) {
                var surveySegmentExpressions = [];

                for (var i = 0; i < projectsToCompare.length; i++) {
                    surveySegmentExpressions.push(Filters.getFilterForBenchmarkTableColumns(context, null, null, projectsToCompare[i], true));
                }

                var surveySegment: HeaderSegment = new HeaderSegment();
                surveySegment.DataSourceNodeId = DataSourceUtil.getDsId(context);
                surveySegment.SegmentType = HeaderSegmentType.Expression;
                surveySegment.HideData = true;
                surveySegment.Label = new Label(report.CurrentLanguage, TextAndParameterUtil.getTextTranslationByKey(context, 'SurveyComparison'));
                surveySegment.Expression = surveySegmentExpressions.join(' OR ');

                //calc score
                var newHeaders = addScore(context);
                newHeaders[0].Title = surveySegment.Label; // first add header and below segment because otherwise scripted table gives wrong results
                newHeaders[1].SubHeaders.Add(surveySegment);

                //log.LogDebug(surveySegmentExpressions.join(' OR '));
            }
        }
    }

    /**
     *  gets previous wave column
     *  @param {object} context: {state: state, report: report, log: log, table: table}
     *  @param {Anwser} answer of wave question for code previous to the selected one
     *  @returns {Header}
     */
    static function tableBenchmarks_addWaveScoreColumn(context, prevWave) {

        var report = context.report;
        var log = context.log;
        var prevWave = getPreviousWave(context);
        var newHeaders = addScore(context); // score cols

        var currentHierarchyAndWaveId: HeaderSegment = new HeaderSegment();
        currentHierarchyAndWaveId.DataSourceNodeId = DataSourceUtil.getDsId(context);
        currentHierarchyAndWaveId.SegmentType = HeaderSegmentType.Expression;
        currentHierarchyAndWaveId.HideData = true;

        if (prevWave) { // current wave is not the 1st wave ever
            currentHierarchyAndWaveId.Expression = Filters.getFilterForBenchmarkTableColumns(context, null, prevWave.Precode, null, true);
            newHeaders[0].Title = new Label(report.CurrentLanguage, prevWave.Text);
        } else {
            currentHierarchyAndWaveId.Expression = Filters.getFilterForBenchmarkTableColumns(context, null, 'noPrevWave', null, true);
            newHeaders[0].Title = TextAndParameterUtil.getLabelByKey(context, 'noPrevWave');
        }

        newHeaders[1].SubHeaders.Add(currentHierarchyAndWaveId);
    }

    /*
  * get code of previous wave
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  * @return {Answer} {Code: code, Label: label}
  */
    static function getPreviousWave(context) {

        var log = context.log;
        var waveQ = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'WaveQuestion');

        if (waveQ) {
            var waves: Answer[] = QuestionUtil.getQuestionAnswers(context, waveQ);
            var currentWave = ParamUtil.GetSelectedCodes(context, 'p_Wave');
            var prevWave;

            if (!currentWave || currentWave.length === 0) {
                throw new Error('PageResults.getPreviousWave: Current wave is not selected.');
            }

            currentWave = currentWave[0];
            var i = 0;

            while (i < waves.length && waves[i].Precode !== currentWave) {
                i++;
            }

            return (i > 0 && i < waves.length) ? waves[i - 1] : null; // i==0 -> no previous wave
        }

        return null;
    }

    /*
  * Checks is Benchmark table was build sucessfully, i.e. if benchmark project is defined
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  */
    static function isBenchmarkAvailable(context) {

        return true; //because score is benchmark now

        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var benchmarkProject = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkProject');
        var hierAvailable = !!DataSourceUtil.getSurveyPropertyValueFromConfig (context, 'HierarchyQuestion');
        var hierarchyLevels = hierAvailable && DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'HierarchyBasedComparisons');
        var reportBases = hierAvailable && context.user.PersonalizedReportBase.split(',');
        var showPrevWave = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'showPrevWave');
        var surveysToCompare = getBenchmarkSurveys(context).length;

        if (benchmarkProject || showPrevWave || (hierAvailable && reportBases.length === 1 && hierarchyLevels && hierarchyLevels.length > 0) || surveysToCompare) {
            return true;
        }
        return false;
    }

    /*
  * Checks is Benchmark table was build sucessfully, i.e. if benchmark project is defined
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  */
    static function table_Benchmarks_hide(context) {
        return ! isBenchmarkAvailable(context);
    }

    /*
  * Gets benchmark surveys
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  *  @return {Array} array of pids
  */
    static function getBenchmarkSurveys(context) {
        var surveysToCompare = [];
        var previousSurvey = SurveyTracker.getComparisonTrackerForSelectedPid(context);

        if (previousSurvey && previousSurvey.Code) {
            surveysToCompare.push(previousSurvey);
        }

        return surveysToCompare;
    }

    /*
  * Checks if dimesion is included in DimensionsWithNormalizedQuestions in config
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  *	@param {string} dimension
  */

    static function isNormalizedDimension(context, dimension) {

        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var dimensionsNorm = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'DimensionsWithNormalizedQuestions');

        if (dimensionsNorm) {
            for (var i = 0; i < dimensionsNorm.length; i++) {
                if (dimension == dimensionsNorm[i]) {
                    return true;
                }
            }
        }
        return false;
    }

    /*
  * Checks either Dimensions or ResultStatements are specified in config
  * @param {object} context: {state: state, report: report, log: log, table: table}
  */
    static function isDimensionsMode(context) {

        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var resultStatements = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'ResultStatements');
        var dimensions = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'Dimensions');

        if (resultStatements && resultStatements.length > 0 && dimensions && dimensions.length > 0) {
            throw new Error('PageResults.tableStatements_AddRows: One of Config properties for page "Results" ResultStatements and Dimensions should be null or [].');
        }

        if (resultStatements && resultStatements.length > 0) {
            return false;
        } else if (dimensions && dimensions.length > 0) {
            return true;
        } else {
            throw new Error('PageResults.tableStatements_AddRows: No data to build rows. Please check ResultStatements and Dimensions properties for page Results.');
        }
    }

    /*
  * Checks whether there are any normilized questions specified
  * @param {object} context: {state: state, report: report, log: log, table: table}
  */
    static function anyNormalizedQuestions(context) {

        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        var questionsNorm = (DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'DimensionsWithNormalizedQuestions')).length;
        var questions = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'ResultStatements');

        //calculate the number of normalized questions
        if(questions) {
            for (var i = 0; i < questions.length; i++) {
                if (questions[i].indexOf('_normalized') != -1) {
                    questionsNorm++;
                }
            }
        }

        return questionsNorm > 0
    }

}