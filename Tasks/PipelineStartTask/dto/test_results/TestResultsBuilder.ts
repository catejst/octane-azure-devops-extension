import {TestResultTestRunAttributes} from "./TestResultTestRunAttributes";
import {Framework, TestFieldNames, TestRunResults} from "./TestResultEnums";
import {TestResultErrorAttributes} from "./TestResultErrorAttributes";
import {TestResultBuildAttributes} from "./TestResultBuildAttributes";
import {TestResultTestFieldAttributes} from "./TestResultTestFieldAttributes";
import {TestResult} from "./TestResult";
import {TestResultTestField} from "./TestResultTestField";
import {TestResultTestRunElement} from "./TestResultTestRunElement";
import {TestResultError} from "./TestResultError";
let convert = require('xml-js');

export class TestResultsBuilder {

    public static buildTestResult(testResults: any, server_id: string, job_id: string): TestResult {
        if (!testResults.count || testResults.count == 0) {
            console.log("No tests' results were retrieved/found");
            return null;
        }
        let testResultTestRuns = this.buildTestResultTestRun(testResults);
        let testResultTestFields = this.buildTestResultTestFields(testResults.value[0].automatedTestType);
        let testResultBuild = this.buildTestResultBuild(server_id, job_id, testResults.value[0].build.id);
        return new TestResult(testResultBuild, testResultTestFields, testResultTestRuns);
    }

    public static getTestResultXml(testResults: any, server_id: string, job_id: string): any {
        let result : TestResult = TestResultsBuilder.buildTestResult(testResults, "my_server_is", "my_job_id");
        let  options = {compact: true, ignoreComment: true, spaces: 4};
        let convertedXml =  '<?xml version="1.0" encoding="utf-8" standalone="yes"?>' + convert.json2xml(result.toJSON(),options);
        console.log("Tests' Results converted for Octane");
        console.log(convertedXml);
        return convertedXml;
    }

    private static buildTestResultTestRun(testResults: any): TestResultTestRunElement[] {
        let testResultTestRunList: Array<TestResultTestRunElement> = [];
        testResults.value.forEach(element => {
            let packagename = element.automatedTestStorage;
            let name = element.automatedTestName;
            let classname = packagename + "." + name;
            let duration = element.durationInMs;
            let status = this.getStatus(element.outcome);
            let started = Date.parse(element.startedDate);
            let external_report_url = element.url;
            let error;
            if (status === TestRunResults.FAILED) {
                let message = element.errorMessage;
                let stackTrace = element.stackTrace;
                if (!message || 0 === message.length) {
                    message = stackTrace;
                }
                let error_attrib = new TestResultErrorAttributes(message);
                error = new TestResultError(error_attrib, stackTrace);
            } else {
                error = undefined;
            }
            let testResultElem = new TestResultTestRunElement(new TestResultTestRunAttributes(undefined, packagename, name, classname, duration,
                status, started, external_report_url), error);

            testResultTestRunList.push(testResultElem);
        });
        return testResultTestRunList;
    }

    private static buildTestResultBuild(server_id: string, job_id: string, build_id: string): TestResultBuildAttributes {
        return new TestResultBuildAttributes(server_id, job_id, build_id);
    }

    private static buildTestResultTestFields(testType: string): TestResultTestField[] {
        let fields: Array<TestResultTestField> = [];
        let field = new TestResultTestFieldAttributes(TestFieldNames.FRAMEWORK, this.getTestType(testType));
        fields.push(new TestResultTestField(field));
        //todo check it
        field = new TestResultTestFieldAttributes(TestFieldNames.TEST_LEVEL, 'Unit Test');
        fields.push(new TestResultTestField(field));
        return fields;
    }

    private static getTestType(testType: string) {
        switch (testType) {
            case "JUnit":
                return Framework.JUNIT;
            default:
                return testType;
        }
    }

    private static getStatus(outcome: string): TestRunResults {
        switch (outcome) {
            case "NotExecuted":
                return TestRunResults.SKIPPED;
            case "Passed":
                return TestRunResults.PASSED;
            case "Failed":
                return TestRunResults.FAILED;
        }
    }
}