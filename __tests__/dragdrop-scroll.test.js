import React from 'react';
import { PanResponder, View } from 'react-native';
import { act, create } from 'react-test-renderer';
import { DDScrollView, useScrollContext } from '../src/dragdrop';

jest.mock('../src/log', () => ({ trace: jest.fn() }));
jest.mock('../src/utils', () => ({ genID: jest.fn() }));

describe('folder scrolling', () => {
  let renderer;
  let scrollOffset;

  function Contents() {
    scrollOffset = useScrollContext();
    return null;
  }

  function renderFolder(contentKey = 'long-folder') {
    const element = (
      <DDScrollView contentKey={contentKey}>
        <Contents />
      </DDScrollView>
    );
    act(() => {
      if (renderer) {
        renderer.update(element);
      } else {
        renderer = create(element);
      }
    });
  }

  function layout(viewIndex, height) {
    act(() => {
      renderer.root.findAllByType(View)[viewIndex].props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 600, height } },
      });
    });
  }

  function scroll(dy) {
    const host = renderer.root.findAllByType(View)[0];
    act(() => {
      host.props.onPanResponderGrant();
      host.props.onPanResponderMove({}, { dx: 0, dy });
    });
  }

  function expectOffset(y) {
    const content = renderer.root.findAllByType(View)[1];
    expect(content.props.style[1].transform).toEqual([{ translateY: -y }]);
    // Drag targets must use the same offset as the visible content.
    expect(scrollOffset.current.y).toBe(y);
  }

  beforeEach(() => {
    jest.spyOn(PanResponder, 'create').mockImplementation(handlers => ({
      panHandlers: handlers,
    }));
    renderFolder();
    layout(0, 600);
    layout(1, 1800);
  });

  afterEach(() => {
    act(() => renderer.unmount());
    renderer = undefined;
    jest.restoreAllMocks();
  });

  it('opens home and other folders at the top, even with equal content heights', () => {
    scroll(-900);
    expectOffset(900);
    renderFolder('home');
    expectOffset(0);
    scroll(-400);
    renderFolder('math');
    expectOffset(0);
  });

  it('keeps the position when the same folder rerenders', () => {
    scroll(-900);
    renderFolder();
    expectOffset(900);
  });

  it('brings content back into view when files are removed or folders collapse', () => {
    scroll(-900);
    layout(1, 800);
    expectOffset(200);
    layout(1, 300);
    expectOffset(0);
  });

  it('clamps the offset when the viewport grows', () => {
    scroll(-1200);
    layout(0, 1000);
    expectOffset(800);
    layout(0, 2000);
    expectOffset(0);
  });

  it('uses the measured content height and keeps gestures within its bounds', () => {
    scroll(-5000);
    expectOffset(1200);
    scroll(5000);
    expectOffset(0);
    layout(1, 600);
    scroll(-5000);
    expectOffset(0);
  });
});
