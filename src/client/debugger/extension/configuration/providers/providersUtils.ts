import { FileType, QuickPickItem, WorkspaceFolder } from 'vscode';
import * as path from 'path';
import { FileSystemUtils, filterByFileType } from '../../../../common/platform/fileSystem';
import { ISpecialQuickPickItem } from '../../../../interpreter/configuration/types';
import { Octicons } from '../../../../common/constants';
import { DebugConfigStrings } from '../../../../common/utils/localize';

export const expectedFileNames: string[] = ['app.py', 'wsgi.py', 'main.py'];
export const manualEntrySuggestion: ISpecialQuickPickItem = {
    label: `${Octicons.Add} ${DebugConfigStrings.selectCustomPath.title}`,
    alwaysShow: true,
};

export async function createItems(folder?: WorkspaceFolder): Promise<QuickPickItem[]> {
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
