public class PulseSurveys_ReportalTable implements IPulseSurveysInfo {

    private var _visiblePulseSurveysTablePath : String; // "PulseSurveyData:VisibleSurveys" = "pageId:tableName"
    private var _isEmptyOptionNeeded: Boolean;
    private var _additionalInfo : String;

    /**
     * constructor
     * @param {Object} storageInfo - path to table that lists all existing pulse surveys (not filtered by userid)
     */
    private function PulseSurveys_ReportalTable(context, storageInfo) {
        _isEmptyOptionNeeded = storageInfo.isEmptyOptionNeeded;
        _visiblePulseSurveysTablePath = storageInfo.hasOwnProperty('visiblePulseSurveysTablePath') ? storageInfo.visiblePulseSurveysTablePath: "PulseSurveyData:VisibleSurveys";
        _additionalInfo = storageInfo.hasOwnProperty('additionalInfo') ? storageInfo.additionalInfo.join(','): [];
    }

    /**
     * creates instance of PulseSurveys_ReportalTable class, should have check if instance is created already (singleton)
     */
    public static function getInstance(context, storageInfo){
        var log = context.log;
        return new PulseSurveys_ReportalTable(context, storageInfo);
    }

    /**
     * implements interface
     * @param {Object} context {state: state, report: report, page: page, user:user, pageContext: pageContext, log: log, confirmit: confirmit}
     * @returns {Array} array of objects {Code: pid, Label: pname} for user's pulse surveys
     */
    public function getVisiblePulseSurveys(context) : Object[] {

        var report = context.report;
        var log = context.log;
        var rawInfo = report.TableUtils.GetRowHeaderCategoryTitles(_visiblePulseSurveysTablePath);
        var surveyList = [];

        if(_isEmptyOptionNeeded) {
            var emptyOption = {};
            emptyOption.Label = TextAndParameterUtil.getTextTranslationByKey(context, 'SelectSurveyEmptyOption');
            emptyOption.Code = 'none';
            surveyList[0] = emptyOption;
        }

        surveyList = surveyList.concat(transformTableHeaderTitlesIntoObj(context, rawInfo));

        return surveyList;
    }

    /**
     * help function that transforms string[][] array of row headers into array of standard objects
     * @param {String[][]} string[][] array of row headers
     * @returns {Array} array of objects {Code: pid, Label: pname} for user's pulse surveys
     */
    private function transformTableHeaderTitlesIntoObj(context, HeaderCategoryTitles) {

        var log = context.log;
        var surveyList = [];

        log.LogDebug(JSON.stringify(HeaderCategoryTitles));
        log.LogDebug(JSON.stringify(_additionalInfo));

        // reverse order
        for(var i=HeaderCategoryTitles.length-1; i>=0; i--) { // reverse order
            var surveyInfo = {};

            //hardcoded in the table: pid->pname->creator->status
            var surveyStatus = HeaderCategoryTitles[i][0];
            var surveyAuthor = HeaderCategoryTitles[i][1];
            var surveyName = HeaderCategoryTitles[i][2];
            var sureveyId = HeaderCategoryTitles[i][3];
            var addInfo = [];

            if(_additionalInfo.indexOf('CreatedByEndUserName')) {
                addInfo.push(surveyAuthor);
            }

            if(_additionalInfo.indexOf('Status')) {
                addInfo.push(surveyStatus);
            }

            addInfo = addInfo.join(', ');

            surveyInfo.Label = addInfo.length > 0 ? surveyName+'('+addInfo+')' : surveyName; //label - inner header
            surveyInfo.Code = sureveyId; // pid - outer header
            surveyList.push(surveyInfo);            
        }

        return surveyList;
    }
}
