/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Node
import path from 'path';
import md5 from 'md5';
import { fromBuffer } from 'file-type';

// Npm
import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';

// Core
import type Driver from '@server/services/disks/driver';

type SerializedLexicalNodeWithSrc = SerializedLexicalNode & { src: string };

/*----------------------------------
- METHODS
----------------------------------*/
const uploadAttachments = async ( 
    value: SerializedEditorState, 
    disk: Driver, 
    destination: string,
    oldState?: SerializedEditorState
) => {

    const usedFilesUrl: string[] = [];

    // Deep check for images / files
    const findFiles = async (
        node: SerializedLexicalNode,
        callback: (node: SerializedLexicalNodeWithSrc) => Promise<void>
    ) => {

        // Attachment
        if (node.type === 'image' || node.type === 'file') {
            if (typeof node.src === 'string') {
                await callback(node as SerializedLexicalNodeWithSrc);
            }
            // Recursion
        } else if (node.children) {
            for (const child of node.children) {
                await findFiles(child, callback);
            }
        }
    }

    const uploadFile = async (node: SerializedLexicalNodeWithSrc) => {

        // Already uploaded
        if (!node.src.startsWith('data:')) {
            usedFilesUrl.push(node.src);
            return node.src;
        }

        // Transform into buffer
        node.src = node.src.replace(/^data:\w+\/\w+;base64,/, '');
        const fileData = Buffer.from(node.src, 'base64');

        // Parse file type from buffer
        const fileType = await fromBuffer(fileData);
        if (!fileType)
            throw new Error('Failed to detect file type');

        // Upload file to disk
        const fileName = md5(node.src) + '.' + fileType.ext;
        const filePath = path.join(destination, fileName);
        const upoadedFile = await disk.outputFile('data', filePath, fileData, {
            encoding: 'binary'
        });

        // Replace node.src with url
        node.src = upoadedFile.path;
        usedFilesUrl.push(node.src);
    }

    const deleteUnusedFile = async (node: SerializedLexicalNodeWithSrc) => {

        // Should be a URL
        if (node.src.startsWith('data:') || !node.src.startsWith('http'))
            return;

        // This file is used
        if (usedFilesUrl.includes(node.src))
            return;

        // Extract file name
        const fileName = path.basename(node.src);
        const filePath = path.join(destination, fileName);

        // Delete file from disk
        await disk.delete('data', filePath);
        console.log('Deleted file:', filePath);
    }

    // Find files in the editor state
    for (const child of value.root.children) {
        await findFiles(child, uploadFile);
    }

    // Old state given: remove unused attachments
    if (oldState !== undefined) {
        for (const child of oldState.root.children) {
            await findFiles(child, deleteUnusedFile);
        }
    }
}

export default { uploadAttachments }