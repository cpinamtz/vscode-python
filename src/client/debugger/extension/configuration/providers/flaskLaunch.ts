// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import * as fs from 'fs-extra';
import { WorkspaceFolder, QuickPickItem, FileType } from 'vscode';
import { DebugConfigStrings } from '../../../../common/utils/localize';
import { MultiStepInput } from '../../../../common/utils/multiStepInput';
import { sendTelemetryEvent } from '../../../../telemetry';
import { EventName } from '../../../../telemetry/constants';
import { DebuggerTypeName } from '../../../constants';
import { LaunchRequestArguments } from '../../../types';
import { DebugConfigurationState, DebugConfigurationType } from '../../types';
import { FileSystemUtils, filterByFileType } from '../../../../common/platform/fileSystem';

export async function buildFlaskLaunchDebugConfiguration(
    input: MultiStepInput<DebugConfigurationState>,
    state: DebugConfigurationState,
): Promise<void> {
    const application = await getApplicationPath(state.folder);
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

    if (!application) {
        const fsUtils = FileSystemUtils.withDefaults();
        if (state.folder) {
            const folderPath = state.folder.uri.path;
            const files = await fsUtils.listdir(folderPath);
            const filteredPythonFiles = filterByFileType(files, FileType.File).filter((filteredFile) =>
                filteredFile[0].endsWith('.py'),
            );
            const items: QuickPickItem[] = [];
            filteredPythonFiles.forEach((filteredFile) => {
                const fileNameChunks = filteredFile[0].split(folderPath + path.sep);
                const fileNamePath = fileNameChunks[fileNameChunks.length - 1];
                if (
                    fileNamePath.endsWith('main.py') ||
                    fileNamePath.endsWith('app.py') ||
                    fileNamePath.endsWith('wsgi.py')
                )
                    items.push({
                        label: fileNamePath.replace('/', '.'),
                        description: filteredFile[0],
                    });
            });

            if (filteredPythonFiles.length > 0) {
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
                    manuallyEnteredAValue = true;
                    config.env!.FLASK_APP = selectedFlaskAppEnvVar.label;
                }
            } else {
                showInputBox();
            }
        } else {
            showInputBox();
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
