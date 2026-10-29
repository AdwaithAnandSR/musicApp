'use no memo';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { handleWidgetAction, getCurrentWidgetProps } from '@/services/widgetService';
import { MusicWidget, type MusicWidgetProps } from './MusicWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    const { widgetAction, clickAction, clickActionData, widgetInfo, renderWidget } = props;

    if (widgetInfo.widgetName === 'Music') {
        switch (widgetAction) {
            case 'WIDGET_ADDED':
            case 'WIDGET_UPDATE':
            case 'WIDGET_RESIZED': {
                const widgetProps = (await getCurrentWidgetProps()) as MusicWidgetProps;
                renderWidget(<MusicWidget {...widgetProps} />);
                break;
            }
            case 'WIDGET_CLICK': {
                if (clickAction) {
                    await handleWidgetAction(clickAction, clickActionData);
                    const widgetProps = (await getCurrentWidgetProps()) as MusicWidgetProps;
                    renderWidget(<MusicWidget {...widgetProps} />);
                }
                break;
            }
            case 'WIDGET_DELETED':
                break;
            default:
                break;
        }
    }
}
