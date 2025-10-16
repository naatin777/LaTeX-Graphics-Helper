import * as assert from 'assert';

import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { localeMap } from '../../locale_map';
import { processUrisWithProgress } from '../../utils/process_urls_with_progress';

suite('process_urls_with_progress Test Suite', () => {
    let getWorkspaceFolderStub: sinon.SinonStub;
    let progressReportStub: sinon.SinonStub;
    let taskStub: sinon.SinonStub;

    const workspaceFolder: vscode.WorkspaceFolder = {
        uri: vscode.Uri.file('/test/workspace'),
        name: 'test-workspace',
        index: 0
    };

    setup(() => {
        getWorkspaceFolderStub = sinon.stub(vscode.workspace, 'getWorkspaceFolder');
        progressReportStub = sinon.stub();
        taskStub = sinon.stub();
    });

    teardown(() => {
        sinon.restore();
    });

    test('should process all uris successfully', async () => {

        const mockProgress = {
            report: progressReportStub
        };

        const uris = [vscode.Uri.file('/test/workspace/file1.txt'), vscode.Uri.file('/test/workspace/file2.txt')];
        getWorkspaceFolderStub.returns(workspaceFolder);
        taskStub.resolves();

        const errors = await processUrisWithProgress(mockProgress as any, uris, taskStub);

        assert.strictEqual(errors.length, 0);
        assert.strictEqual(taskStub.callCount, 2);
        assert.strictEqual(progressReportStub.callCount, 2);
        assert.deepStrictEqual(progressReportStub.firstCall.args[0], { increment: 50, message: '1/2: file1.txt' });
        assert.deepStrictEqual(progressReportStub.secondCall.args[0], { increment: 50, message: '2/2: file2.txt' });
    });

    test('should return errors for failed tasks', async () => {

        const mockProgress = {
            report: progressReportStub
        };

        const uris = [vscode.Uri.file('/test/workspace/file1.txt'), vscode.Uri.file('/test/workspace/file2.txt')];
        const error = new Error('Task failed');
        getWorkspaceFolderStub.returns(workspaceFolder);
        taskStub.onFirstCall().resolves();
        taskStub.onSecondCall().rejects(error);

        const errors = await processUrisWithProgress(mockProgress as any, uris, taskStub);

        assert.strictEqual(errors.length, 1);
        assert.deepStrictEqual(errors[0], { uri: uris[1], reason: error });
        assert.strictEqual(taskStub.callCount, 2);
        assert.strictEqual(progressReportStub.callCount, 2);
    });

    test('should return error if workspace folder is not found', async () => {

        const mockProgress = {
            report: progressReportStub
        };

        const uris = [vscode.Uri.file('/test/workspace/file1.txt')];
        getWorkspaceFolderStub.returns(undefined);

        const errors = await processUrisWithProgress(mockProgress as any, uris, taskStub);

        assert.strictEqual(errors.length, 1);
        assert.strictEqual(errors[0].reason.message, localeMap('workspaceFolderNotFound'));
        assert.strictEqual(taskStub.notCalled, true);
        assert.strictEqual(progressReportStub.callCount, 1);
    });

    test('should handle empty uri list', async () => {

        const mockProgress = {
            report: progressReportStub
        };

        const uris: vscode.Uri[] = [];
        const errors = await processUrisWithProgress(mockProgress as any, uris, taskStub);

        assert.strictEqual(errors.length, 0);
        assert.ok(taskStub.notCalled);
        assert.ok(progressReportStub.notCalled);
    });
});
