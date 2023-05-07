// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import { FileType, Uri } from 'vscode';
import { FileSystemUtils } from '../../../../../client/common/platform/fileSystem';
import { createItems } from '../../../../../client/debugger/extension/configuration/providers/providersUtils';
import { Octicons } from '../../../../../client/common/constants';
import { DebugConfigStrings } from '../../../../../client/common/utils/localize';

suite('Debugging - Providers Utils - createItems', () => {
    let listdirStub: sinon.SinonStub;
    setup(() => {
        listdirStub = sinon.stub(FileSystemUtils.prototype, 'listdir');
    });
    teardown(() => {
        sinon.restore();
        listdirStub.restore();
    });
    test('createItems when WorkspaceFolder is undefined', async () => {
        const folder = undefined;

        const items = await createItems(folder);

        expect(items).to.be.deep.equal([
            {
                label: `${Octicons.Add} ${DebugConfigStrings.selectCustomPath.title}`,
                alwaysShow: true,
            },
        ]);
        expect(items.length).to.be.equal(1);
    });

    test('createItems when WorkspaceFolder is provided but there is no any Python file', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        listdirStub.withArgs().resolves([]);

        const items = await createItems(folder);

        expect(items).to.be.deep.equal([
            {
                label: `${Octicons.Add} ${DebugConfigStrings.selectCustomPath.title}`,
                alwaysShow: true,
            },
        ]);
        expect(items.length).to.be.equal(1);
    });

    test('createItems when WorkspaceFolder is provided and a Python file exists but is not one of the standard ones', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        listdirStub.withArgs().resolves([['one/two/hello.py', FileType.File]]);

        const items = await createItems(folder);

        expect(items).to.be.deep.equal([
            {
                label: `${Octicons.Add} ${DebugConfigStrings.selectCustomPath.title}`,
                alwaysShow: true,
            },
        ]);
        expect(items.length).to.be.equal(1);
    });

    test('createItems when WorkspaceFolder is provided and a Python file exists and is one of the standard ones', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        listdirStub.withArgs().resolves([['one/two/app.py', FileType.File]]);

        const items = await createItems(folder);

        expect(items).to.be.deep.equal([
            {
                label: `${Octicons.Add} ${DebugConfigStrings.selectCustomPath.title}`,
                alwaysShow: true,
            },
            {
                label: `app.py`,
                description: 'one/two/app.py',
            },
        ]);
        expect(items.length).to.be.equal(2);
    });
});
