/* global afterEach describe Event expect test */
import React from 'react'

import { act, cleanup, render } from '@testing-library/react'

import { WindowContext } from '../window-context' /* eslint-disable-line node/no-missing-import */
/* eslint-disable-next-line node/no-missing-import */
import { breakpointPlugin } from '../breakpoint-plugin'
import { makeWindowPlugin } from '../make-plugin' /* eslint-disable-line node/no-missing-import */
import { ViewListener, defaultTheme } from '../../../testlib'

const getDefaultTheme = () => defaultTheme

const generateTestData = (theme) => {
  const breakpoints = Object.keys(theme.breakpoints.values)
  const boundaryTests = Object.entries(theme.breakpoints.values)
  const subBoundaryTests = boundaryTests.map(([, boundary], i) =>
    i === 0 ? null : [breakpoints[i - 1], boundary - 1]).filter(e => e)
  const superBoundaryTests = boundaryTests.map(([, boundary], i) =>
    [breakpoints[i], boundary + 1])

  return subBoundaryTests.concat(boundaryTests).concat(superBoundaryTests)
}

const defaultTestData = generateTestData(defaultTheme)

const breakpointTestFor = () => (breakpoint, boundary) => {
  window.innerWidth = boundary
  let viewInfo
  const callback = (info) => { viewInfo = info }
  render(
    <WindowContext plugins={[breakpointPlugin]} getTheme={getDefaultTheme}>
      <ViewListener callback={callback} />
    </WindowContext>
  )
  expect(viewInfo.breakpoint).toBe(breakpoint)
}

describe('WindowContext', () => {
  afterEach(cleanup)

  describe('using default theme', () => {
    test.each(defaultTestData)("selects '%s' at boundary %d",
      breakpointTestFor(defaultTheme))
  })

  /*
  describe("using weird theme", () => {
    test.each(weirdTestData)("selects '%s' at boundary %d",
      breakpointTestFor(weirdTheme))
  })
  */

  test('provides no info without any plugins', () => {
    window.innerWidth = 1200
    let viewInfo
    const callback = (info) => { viewInfo = info }
    render(
      <WindowContext getTheme={getDefaultTheme}>
        <ViewListener callback={callback} />
      </WindowContext>
    )
    const viewInfoKeys = Object.keys(viewInfo).sort()
    expect(viewInfoKeys).toEqual(['screen', 'visualViewport', 'window'])
    for (const key of viewInfoKeys) {
      expect(Object.keys(viewInfo[key])).toHaveLength(0)
    }
  })

  test('does not re-render when size changes, but breakpoint does not using breakpointPlugin', () => {
    window.innerWidth = 1200
    let renderCount = 0
    const callback = () => { renderCount += 1 }

    render(
      <WindowContext plugins={[breakpointPlugin]} getTheme={getDefaultTheme}>
        <ViewListener callback={callback} />
      </WindowContext>
    )
    expect(renderCount).toBe(1)
    act(() => {
      window.innerWidth = 1205
      window.dispatchEvent(new Event('resize'))
    })
    expect(renderCount).toBe(1)
  })

  test('re-renders when size changes breakpoint using breakpointPlugin', () => {
    window.innerWidth = 1200
    let renderCount = 0
    let viewInfo
    const callback = (info) => {
      renderCount += 1
      viewInfo = info
    }
    render(
      <WindowContext plugins={[breakpointPlugin]} getTheme={getDefaultTheme}>
        <ViewListener callback={callback} />
      </WindowContext>
    )
    expect(renderCount).toBe(1)
    act(() => {
      window.innerWidth = 600
      window.dispatchEvent(new Event('resize'))
    })
    expect(viewInfo.breakpoint).toBe('sm')
    expect(renderCount).toBe(2)
  })

  test("polls for changes when tracking 'screenX'", async () => {
    window.screenX = 0
    let renderCount = 0
    let viewInfo
    const callback = (info) => {
      renderCount += 1
      viewInfo = info
    }
    render(
      <WindowContext plugins={[makeWindowPlugin('screenX')]}>
        <ViewListener callback={callback} />
      </WindowContext>
    )
    expect(renderCount).toBe(1)
    act(() => {
      window.screenX = 100
      const htmlNode = document.getElementsByTagName('html').item(0)
      htmlNode.dispatchEvent(new Event('mouseleave'))
    })
    await new Promise(resolve => setTimeout(resolve, 250 * 2))
    expect(viewInfo.window.screenX).toBe(100)
    expect(renderCount).toBe(2)
  })

  test('listeners cleaned up after unmount()', async () => {
    const currListeners = {}
    const realAddEventListener = window.addEventListener
    window.addEventListener = (eventType, listener) => {
      realAddEventListener(eventType, listener)
      if (currListeners[eventType] === undefined) {
        currListeners[eventType] = []
      }
      currListeners[eventType].push(listener)
    }
    const realRemoveEventListener = window.removeEventListener
    window.removeEventListener = (eventType, listener) => {
      realRemoveEventListener(eventType, listener)
      const eventListeners = currListeners[eventType]
      if (eventListeners) {
        const listenerIndex = eventListeners.indexOf(listener)
        if (listenerIndex !== -1) {
          eventListeners.splice(listener, 1)
          if (eventListeners.length === 0) delete currListeners[eventType]
        }
      }
    }
    window.innerWidth = 1200
    const callback = () => {}
    const { unmount } = render(
      <WindowContext plugins={[breakpointPlugin]} getTheme={getDefaultTheme}>
        <ViewListener callback={callback} />
      </WindowContext>
    )
    expect(currListeners.resize.length).toBe(1)

    unmount()
    // cleanup is async after unmount; not aware of a cleaner way to do this, so we just wait a bit
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(currListeners.resize).toBeUndefined()
  })
})
