// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    CancellationError,
    CancellationToken,
    l10n,
    LanguageModelTextPart,
    LanguageModelTool,
    LanguageModelToolInvocationOptions,
    LanguageModelToolInvocationPrepareOptions,
    LanguageModelToolResult,
    PreparedToolInvocation,
} from 'vscode';
import { PythonExtension } from '../api/types';
import { IServiceContainer } from '../ioc/types';
import { ICodeExecutionService } from '../terminals/types';
import { TerminalCodeExecutionProvider } from '../terminals/codeExecution/terminalCodeExecution';
import { getEnvDisplayName, getEnvironmentDetails, raceCancellationError } from './utils';
import { resolveFilePath } from './utils';
import { traceError } from '../logging';
import { ITerminalHelper } from '../common/terminal/types';
import { IDiscoveryAPI } from '../pythonEnvironments/base/locator';

export interface IResourceReference {
    resourcePath?: string;
}

export class GetExecutableTool implements LanguageModelTool<IResourceReference> {
    private readonly terminalExecutionService: TerminalCodeExecutionProvider;
    private readonly terminalHelper: ITerminalHelper;
    public static readonly toolName = 'get_python_executable_details';
    constructor(
        private readonly api: PythonExtension['environments'],
        private readonly serviceContainer: IServiceContainer,
        private readonly discovery: IDiscoveryAPI,
    ) {
        this.terminalExecutionService = this.serviceContainer.get<TerminalCodeExecutionProvider>(
            ICodeExecutionService,
            'standard',
        );
        this.terminalHelper = this.serviceContainer.get<ITerminalHelper>(ITerminalHelper);
    }
    async invoke(
        options: LanguageModelToolInvocationOptions<IResourceReference>,
        token: CancellationToken,
    ): Promise<LanguageModelToolResult> {
        const resourcePath = resolveFilePath(options.input.resourcePath);

        try {
            const message = await getEnvironmentDetails(
                resourcePath,
                this.api,
                this.terminalExecutionService,
                this.terminalHelper,
                undefined,
                token,
            );
            return new LanguageModelToolResult([new LanguageModelTextPart(message)]);
        } catch (error) {
            if (error instanceof CancellationError) {
                throw error;
            }
            traceError('Error while getting environment information', error);
            const errorMessage: string = `An error occurred while fetching environment information: ${error}`;
            return new LanguageModelToolResult([new LanguageModelTextPart(errorMessage)]);
        }
    }

    async prepareInvocation?(
        options: LanguageModelToolInvocationPrepareOptions<IResourceReference>,
        token: CancellationToken,
    ): Promise<PreparedToolInvocation> {
        const resourcePath = resolveFilePath(options.input.resourcePath);
        const envName = await raceCancellationError(getEnvDisplayName(this.discovery, resourcePath, this.api), token);
        return {
            invocationMessage: envName
                ? l10n.t('Fetching Python executable information for {0}', envName)
                : l10n.t('Fetching Python executable information'),
        };
    }
}
