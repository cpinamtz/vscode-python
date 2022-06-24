// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { FileSystem } from '../../../client/common/platform/fileSystem';
import { FileSystemPathUtils } from '../../../client/common/platform/fs-paths';
import { IFileSystemPathUtils } from '../../../client/common/platform/types';
import { EnvironmentVariablesService } from '../../../client/common/variables/environment';
import { IEnvironmentVariablesService } from '../../../client/common/variables/types';

use(chaiAsPromised);

// Functional tests that run code using the VS Code API are found
// in envVarsService.test.ts.

suite('Environment Variables Service', () => {
    let pathUtils: IFileSystemPathUtils;
    let variablesService: IEnvironmentVariablesService;
    setup(() => {
        pathUtils = FileSystemPathUtils.withDefaults();
        const fs = new FileSystem();
        variablesService = new EnvironmentVariablesService(pathUtils, fs);
    });

    suite('parseFile()', () => {
        test('Custom variables should be undefined with no argument', async () => {
            const vars = await variablesService.parseFile(undefined);
            expect(vars).to.equal(undefined, 'Variables should be undefined');
        });
    });
});
