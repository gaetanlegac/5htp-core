/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { TPostData } from '@common/router/request/api';
import { FileToUpload } from '@client/components/inputv3/file';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- UTILS
----------------------------------*/
export const toMultipart = (postData: TPostData) => {

    const formData = new FormData();
    for (const key in postData) {
        let data = postData[key];
        if (typeof data === 'object' && (data instanceof FileToUpload))
            data = data.data;
        formData.append(key, data);
    }

    return formData;
}