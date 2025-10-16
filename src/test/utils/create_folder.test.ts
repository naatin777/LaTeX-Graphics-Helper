// import assert from 'assert';

// import * as sinon from 'sinon';
// import * as vscode from 'vscode';

// import { Path } from '../../type';
// import { createFolder } from '../../utils/create_folder';

// suite('createFolder Test Suite', () => {
//     // let fileSpy: sinon.SinonSpy;
//     // let dirnameSpy: sinon.SinonSpy;
//     let createDirectoryStub: sinon.SinonSpy<[uri: vscode.Uri], Thenable<void>>;

//     setup(() => {
//         // fileSpy = sinon.spy(vscode.Uri, 'file');
//         // dirnameSpy = sinon.spy(Utils, 'dirname');
//         createDirectoryStub = sinon.stub(vscode.workspace.fs, 'createDirectory').resolves();
//     });

//     teardown(() => {
//         sinon.restore();
//     });

//     test('should create parent directory for given file path', async () => {
//         const filePath = '/path/to/file.txt';
//         const expectedDirUri = vscode.Uri.file('/path/to');

//         await createFolder(filePath as Path);

//         // assert.ok(fileSpy.calledOnceWith(filePath), 'vscode.Uri.file should be called with the file path');
//         // assert.ok(dirnameSpy.calledOnce, 'Utils.dirname should be called');
//         assert.deepStrictEqual(createDirectoryStub.firstCall.args[0], expectedDirUri, 'createDirectory should be called with the correct directory URI');
//     });

//     test('should handle nested paths correctly', async () => {
//         const filePath = '/deep/nested/path/to/file.txt';
//         const expectedDirUri = vscode.Uri.file('/deep/nested/path/to');

//         await createFolder(filePath as Path);

//         assert.deepStrictEqual(createDirectoryStub.firstCall.args[0], expectedDirUri, 'createDirectory should be called with the nested directory URI');
//     });

//     test('should propagate errors from createDirectory', async () => {
//         const filePath = '/path/to/file.txt';
//         const error = new Error('Permission denied');

//         createDirectoryStub.rejects(error);

//         await assert.rejects(createFolder(filePath as Path), error);
//     });
// });
