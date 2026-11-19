import React from 'react';
import { PanResponder, Text, View } from 'react-native';
import { act, create } from 'react-test-renderer';
import { DDProvider, DDView } from '../src/dragdrop';

jest.mock('../src/log', () => ({ trace: jest.fn() }));
jest.mock('../src/utils', () => ({ genID: () => 1 }));

describe('folder drag activation', () => {
  let renderer;
  let source;

  function wait(milliseconds) {
    act(() => jest.advanceTimersByTime(milliseconds));
  }

  function startsDrag(dx, dy) {
    let result;
    act(() => {
      result = source.props.onMoveShouldSetPanResponder({}, { dx, dy });
    });
    return result;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(PanResponder, 'create').mockImplementation(handlers => ({ panHandlers: handlers }));
    act(() => {
      renderer = create(
        <DDProvider>
          <DDView id="School"><Text>School</Text></DDView>
        </DDProvider>,
      );
    });
    source = renderer.root.findAllByType(View).find(view => view.props.onStartShouldSetPanResponderCapture);
    act(() => source.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 70 } } }));
  });

  afterEach(() => {
    act(() => renderer.unmount());
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([[0, -30], [30, 0], [30, -30]])('keeps a swipe from becoming a drag after the timer expires (%s, %s)', (dx, dy) => {
    source.props.onStartShouldSetPanResponderCapture();
    wait(100);
    expect(startsDrag(dx, dy)).toBe(false);
    wait(800);
    expect(startsDrag(dx, dy)).toBe(false);
  });

  it.each(['onTouchEnd', 'onTouchCancel'])('cancels activation on %s', event => {
    source.props.onStartShouldSetPanResponderCapture();
    wait(100);
    source.props[event]();
    wait(800);
    expect(startsDrag(0, -30)).toBe(false);
  });

  it('requires a full hold for the current touch after repeated taps', () => {
    source.props.onStartShouldSetPanResponderCapture();
    wait(400);
    source.props.onTouchEnd();
    source.props.onStartShouldSetPanResponderCapture();
    wait(350);
    expect(startsDrag(0, -5)).toBe(false);
    wait(350);
    expect(startsDrag(0, -30)).toBe(true);
  });

  it('allows an intentional stationary long press followed by a diagonal drag', () => {
    source.props.onStartShouldSetPanResponderCapture();
    wait(700);
    expect(startsDrag(30, -30)).toBe(true);
  });

  it('clears an unfinished hold when the folder unmounts', () => {
    source.props.onStartShouldSetPanResponderCapture();
    act(() => renderer.unmount());
    expect(jest.getTimerCount()).toBe(0);
  });
});
