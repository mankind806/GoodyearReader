import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {AutomationMode} from '../../../utils/automation';
import {getLocalMessage} from '../../../utils/locales';
import {ControlGroup, MultiSwitch} from '../../controls';
import {SunMoonIcon, SystemIcon, WatchIcon} from '../../icons';

export default function AppSwitch(props: ViewProps) {
    const isOn = props.data.settings.enabled === true && !props.data.settings.automation.enabled;
    const isOff = props.data.settings.enabled === false && !props.data.settings.automation.enabled;
    const isAutomation = props.data.settings.automation.enabled;
    const isTimeAutomation = props.data.settings.automation.mode === AutomationMode.TIME;
    const isLocationAutomation = props.data.settings.automation.mode === AutomationMode.LOCATION;
    const now = new Date();

    const values = [
        {value: 'on', content: getLocalMessage('on')},
        {value: 'auto', content: 'Auto'},
        {value: 'off', content: getLocalMessage('off')},
    ];
    const value = isOn ? 'on' : isOff ? 'off' : 'auto';

    function onSwitchChange(v: string) {
        if (v === 'on') {
            props.actions.changeSettings({
                enabled: true,
                automation: {... props.data.settings.automation, ...{enabled: false}},
            });
        } else if (v === 'off') {
            props.actions.changeSettings({
                enabled: false,
                automation:  {... props.data.settings.automation, ...{enabled: false}},
            });
        } else if (v === 'auto') {
            props.actions.changeSettings({
                automation: {... props.data.settings.automation, ...{mode: AutomationMode.SYSTEM, enabled: true}},
            });
        }
    }

    const descriptionText = isOn ?
        'Extension is enabled' :
        isOff ?
            'Extension is disabled' :
            isTimeAutomation ?
                'Switches according to specified time' :
                isLocationAutomation ?
                    'Switched according to location' :
                    'Switches according to system dark mode';
    const description = (
        <span
            class={{
                'app-switch__description': true,
                'app-switch__description--on': props.data.isEnabled,
                'app-switch__description--off': !props.data.isEnabled,
            }}
        >
            {descriptionText}
        </span>
    );

    return (
        <ControlGroup class="app-switch">
            <ControlGroup.Control>
                <MultiSwitch
                    class="app-switch__control"
                    options={values}
                    value={value}
                    onChange={onSwitchChange}
                >
                    <span
                        class={{
                            'app-switch__time': true,
                            'app-switch__time--active': isAutomation,
                        }}
                    >
                        {(isTimeAutomation
                            ? <WatchIcon hours={now.getHours()} minutes={now.getMinutes()} />
                            : (isLocationAutomation
                                ? (<SunMoonIcon date={now} latitude={props.data.settings.location.latitude!} longitude={props.data.settings.location.longitude!} />)
                                : <SystemIcon />))}
                    </span>
                </MultiSwitch>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {description}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
