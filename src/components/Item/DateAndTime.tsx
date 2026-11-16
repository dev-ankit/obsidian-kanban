import classcat from 'classcat';
import { getLinkpath, moment } from 'obsidian';
import { JSX } from 'preact/compat';
import { StateManager } from 'src/StateManager';
import { t } from 'src/lang/helpers';

import { useCurrentTime } from '../CurrentTime';
import { c, useDateColor } from '../helpers';
import { Item } from '../types';

export function getRelativeDate(date: moment.Moment, time: moment.Moment, now: moment.Moment) {
  if (time) {
    return time.from(now);
  }

  const today = now.clone().startOf('day');

  if (today.isSame(date, 'day')) {
    return t('today');
  }

  const diff = date.diff(today, 'day');

  if (diff === -1) {
    return t('yesterday');
  }

  if (diff === 1) {
    return t('tomorrow');
  }

  return date.from(today);
}

interface DateProps {
  item: Item;
  stateManager: StateManager;
}

export function RelativeDate({ item, stateManager }: DateProps) {
  const shouldShowRelativeDate = stateManager.useSetting('show-relative-date');
  const { date, time } = item.data.metadata;
  const relativeDate = useCurrentTime((now) =>
    shouldShowRelativeDate && date ? getRelativeDate(date, time, moment(now)) : null
  );
  const dateColor = useDateColor(stateManager, shouldShowRelativeDate ? time ?? date : undefined);

  if (relativeDate === null) return null;

  // A label, not a chip: it takes the rule's text color and nothing else.
  return (
    <span className={c('item-metadata-date-relative')} style={{ color: dateColor?.color }}>
      {relativeDate}
    </span>
  );
}

interface DateAndTimeProps {
  onEditDate?: JSX.MouseEventHandler<HTMLSpanElement>;
  onEditTime?: JSX.MouseEventHandler<HTMLSpanElement>;
  filePath: string;
}

export function DateAndTime({
  item,
  stateManager,
  filePath,
  onEditDate,
  onEditTime,
}: DateProps & DateAndTimeProps) {
  const moveDates = stateManager.useSetting('move-dates');
  const dateFormat = stateManager.useSetting('date-format');
  const timeFormat = stateManager.useSetting('time-format');
  const dateDisplayFormat = stateManager.useSetting('date-display-format');
  const shouldLinkDate = stateManager.useSetting('link-date-to-daily-note');

  const targetDate = moveDates ? item.data.metadata.time ?? item.data.metadata.date : undefined;
  const dateColor = useDateColor(stateManager, targetDate);

  if (!targetDate) return null;

  const dateStr = targetDate.format(dateFormat);

  if (!dateStr) return null;

  const hasDate = !!item.data.metadata.date;
  const hasTime = !!item.data.metadata.time;
  const dateDisplayStr = targetDate.format(dateDisplayFormat);
  const timeDisplayStr = !hasTime ? null : targetDate.format(timeFormat);

  const datePath = dateStr ? getLinkpath(dateStr) : null;
  const isResolved = dateStr
    ? stateManager.app.metadataCache.getFirstLinkpathDest(datePath, filePath)
    : null;
  const date =
    datePath && shouldLinkDate ? (
      <a
        href={datePath}
        data-href={datePath}
        className={`internal-link ${isResolved ? '' : 'is-unresolved'}`}
        target="blank"
        rel="noopener"
      >
        {dateDisplayStr}
      </a>
    ) : (
      dateDisplayStr
    );

  const dateProps: HTMLAttributes<HTMLSpanElement> = {};

  if (!shouldLinkDate) {
    dateProps['aria-label'] = t('Change date');
    dateProps.onClick = onEditDate;
  }

  return (
    <span
      data-date={targetDate.toISOString()}
      style={
        dateColor && {
          '--date-color': dateColor.color,
          '--date-background-color': dateColor.backgroundColor,
        }
      }
      className={classcat([
        c('item-metadata-date-wrapper'),
        c('date'),
        {
          'has-background': !!dateColor?.backgroundColor,
        },
      ])}
    >
      {hasDate && (
        <>
          <span
            {...dateProps}
            className={`${c('item-metadata-date')} ${!shouldLinkDate ? 'is-button' : ''}`}
          >
            {date}
          </span>{' '}
        </>
      )}
      {hasTime && (
        <span
          onClick={onEditTime}
          className={`${c('item-metadata-time')} is-button`}
          aria-label={t('Change time')}
        >
          {timeDisplayStr}
        </span>
      )}
    </span>
  );
}
