/*----------------------------------
- DEPENDANCES
----------------------------------*/

// npm
import React from 'react';
import {
    ElementFormatType,
    FORMAT_ELEMENT_COMMAND,
    INDENT_CONTENT_COMMAND,
    LexicalEditor,
    OUTDENT_CONTENT_COMMAND,
} from 'lexical';

// Core
import Button from '@client/components/button';
import DropDown from '@client/components/dropdown';

/*----------------------------------
- TYPES
----------------------------------*/
const FormatOptions: {
    label: string;
    value: ElementFormatType | 'indent' | 'outdent';
    icon: string;
    iconRTL: string;
}[] = [{
    label: 'Left Align',
    value: 'left',
    icon: /* @icon */'align-left',
    iconRTL: /* @icon */'align-left',
}, {
    label: 'Center Align',
    value: 'center',
    icon: /* @icon */'align-center',
    iconRTL: /* @icon */'align-center',
}, {
    label: 'Right Align',
    value: 'right',
    icon: /* @icon */'align-right',
    iconRTL: /* @icon */'align-right',
}, {
    label: 'Justify Align',
    value: 'justify',
    icon: /* @icon */'align-justify',
    iconRTL: /* @icon */'align-justify',
}, {
    label: 'Start Align',
    value: 'start',
    icon: /* @icon */'align-left',
    iconRTL: /* @icon */'align-right',
}, {
    label: 'End Align',
    value: 'end',
    icon: /* @icon */'align-right',
    iconRTL: /* @icon */'align-left',
}, {
    label: 'Indent',
    value: 'indent',
    icon: /* @icon */'indent',
    iconRTL: /* @icon */'outdent',
}, {
    label: 'Outdent',
    value: 'outdent',
    icon: /* @icon */'outdent',
    iconRTL: /* @icon */'indent',
},]

/*----------------------------------
- COMPONENT
----------------------------------*/
export default function ElementFormatDropdown({
    editor,
    value,
    isRTL,
    disabled = false,
}: {
    editor: LexicalEditor;
    value: ElementFormatType;
    isRTL: boolean;
    disabled: boolean;
}) {

    const currentValue = value || 'left';
    const formatOption = FormatOptions.find((option) => option.value === currentValue) || FormatOptions[0];

    return (
        <DropDown disabled={disabled} icon={isRTL ? formatOption.iconRTL : formatOption.icon} size="s" 
            label={formatOption.label}
            popover={{ tag: 'li' }}
        >
            {FormatOptions.map((option) => (
                <Button icon={isRTL ? option.iconRTL : option.icon}
                    onClick={() => {
                        if (option.value === 'indent')
                            editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
                        else if (option.value === 'outdent')
                            editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
                        else
                            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, option.value);
                    }}>
                    {option.label}
                </Button>
            ))}
        </DropDown>
    )
}