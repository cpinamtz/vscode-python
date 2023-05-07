// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import * as fs from 'fs-extra';
import { WorkspaceFolder, QuickPickItem, FileType } from 'vscode';
import { DebugConfigStrings, InterpreterQuickPickList } from '../../../../common/utils/localize';
import { MultiStepInput } from '../../../../common/utils/multiStepInput';
import { sendTelemetryEvent } from '../../../../telemetry';
import { EventName } from '../../../../telemetry/constants';
import { DebuggerTypeName } from '../../../constants';
import { LaunchRequestArguments } from '../../../types';
import { DebugConfigurationState, DebugConfigurationType } from '../../types';
import { FileSystemUtils, filterByFileType } from '../../../../common/platform/fileSystem';
import { ISpecialQuickPickItem } from '../../../../interpreter/configuration/types';
import { Octicons } from '../../../../common/constants';

export async function buildFlaskLaunchDebugConfiguration(
    input: MultiStepInput<DebugConfigurationState>,
    state: DebugConfigurationState,
): Promise<void> {
    const manualEntrySuggestion: ISpecialQuickPickItem = {
        label: `${Octicons.Add} ${InterpreterQuickPickList.enterPath.label}`,
        alwaysShow: true,
    };
    const application = await getApplicationPath(state.folder);
    const expectedFileNames: string[] = ['main.py', 'app.py', 'wsgi.py'];
    let manuallyEnteredAValue: boolean | undefined;
    const config: Partial<LaunchRequestArguments> = {
        name: DebugConfigStrings.flask.snippet.name,
        type: DebuggerTypeName,
        request: 'launch',
        module: 'flask',
        env: {
            FLASK_APP: application || 'app.py',
            FLASK_DEBUG: '1',
        },
        args: ['run', '--no-debugger', '--no-reload'],
        jinja: true,
        justMyCode: true,
    };

    async function showInputBox() {
        const selectedFlaskAppEnvVar = await input.showInputBox({
            title: DebugConfigStrings.flask.enterAppPathOrNamePath.title,
            value: 'app.py',
            prompt: DebugConfigStrings.flask.enterAppPathOrNamePath.prompt,
            validate: (value) =>
                Promise.resolve(
                    value && value.trim().length > 0
                        ? undefined
                        : DebugConfigStrings.flask.enterAppPathOrNamePath.invalid,
                ),
        });

        if (selectedFlaskAppEnvVar) {
            manuallyEnteredAValue = true;
            config.env!.FLASK_APP = selectedFlaskAppEnvVar;
        }
    }

    async function createItems(folder?: WorkspaceFolder): Promise<QuickPickItem[]> {
        const items: QuickPickItem[] = [manualEntrySuggestion];

        if (folder) {
            const folderPath = folder.uri.path;
            const files = await FileSystemUtils.withDefaults().listdir(folderPath);
            const filteredPythonFiles = filterByFileType(files, FileType.File).filter((filteredFile) =>
                filteredFile[0].endsWith('.py'),
            );

            filteredPythonFiles.forEach((filteredFile) => {
                const fileNameChunks = filteredFile[0].split(folderPath + path.sep);
                const fileNamePath = fileNameChunks[fileNameChunks.length - 1];

                for (const expectedFileName of expectedFileNames) {
                    if (fileNamePath.endsWith(expectedFileName)) {
                        items.push({
                            label: fileNamePath.replace('/', '.'),
                            description: filteredFile[0],
                        });
                    }
                }
            });
        }

        return items;
    }

    if (!application) {
        const items = await createItems(state.folder);
        const selectedFlaskAppEnvVar = await input.showQuickPick({
            title: DebugConfigStrings.flask.enterAppPathOrNamePath.title,
            items,
            placeholder: 'Find by the name of the file where the Flask app is instantiated',
            acceptFilterBoxTextAsSelection: true,
            initialize: (quickPick) =>
                Promise.resolve(
                    quickPick && quickPick.value.trim().length > 0
                        ? undefined
                        : DebugConfigStrings.flask.enterAppPathOrNamePath.invalid,
                ),
            prompt: DebugConfigStrings.flask.enterAppPathOrNamePath.prompt,
        });
        if (selectedFlaskAppEnvVar) {
            if (selectedFlaskAppEnvVar.label === manualEntrySuggestion.label) {
                showInputBox();
            } else {
                manuallyEnteredAValue = true;
                config.env!.FLASK_APP = selectedFlaskAppEnvVar.label;
            }
        }
    }

    sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
        configurationType: DebugConfigurationType.launchFlask,
        autoDetectedFlaskAppPyPath: !!application,
        manuallyEnteredAValue,
    });
    Object.assign(state.config, config);
}

export async function getApplicationPath(folder: WorkspaceFolder | undefined): Promise<string | undefined> {
    if (!folder) {
        return undefined;
    }
    const defaultLocationOfManagePy = path.join(folder.uri.fsPath, 'app.py');
    if (await fs.pathExists(defaultLocationOfManagePy)) {
        return 'app.py';
    }
    return undefined;
}
