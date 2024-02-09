/**
 * @file Defines functions to create plugins to add data to the `ViewportContext` results.
 */
import { breakpointPlugin } from './breakpoint-plugin' /* eslint-disable-line node/no-missing-import */

/**
 * Helper function used by the more specific {@link makeScreenPlugin}, {@link makeVisualViewportPlugin}, and
 * {@link makeWindowPlugin}.
 * 
 * @param {object} obj - The data source object; either `screen`, `visualViewport', or `window`.
 * @param {string} key - The key to access the sub-data object of the {@link ViewportContext} info object. This will 
 *   match the `obj` (e.g., 'screen' for the `screen` object).
 * @param {string} attribute - The attribute of the specified `obj` to extract.
 * @prama {object} validAttributes - An object defining the valid attributes for the given `obj` type and the events 
 *   associated with each attribute.
 * @returns {function} A plugin func to retrieve the requested attributes.
 * @private
 */
const makePlugin = (obj, key, attribute, validAttributes) => {
  const pluginFunc = (prevInfo, newInfo) => {
    if (!(attribute in validAttributes)) {
      throw new Error(`No such attribute '${attribute}' to extract from '${key}'.`)
    }

    const value = attribute === 'screenX' || attribute === 'screenLeft'
      ? obj.screenX || obj.screenLeft
      : attribute === 'screenY' || attribute === 'screenTop'
        ? obj.screenY || obj.screenTop
        : attribute === 'angle'
          ? obj.orientation.angle
          : attribute === 'orientation'
            ? obj.orientation.type
            : obj[attribute]

    if (value !== prevInfo[key][attribute]) {
      newInfo[key][attribute] = value
      return true
    }
    return false
  }

  pluginFunc.target = key
  pluginFunc.attribute = attribute
  pluginFunc.events = validAttributes[attribute].events

  return pluginFunc
}

/**
 * Object defining the valid `screen` attributes and associated events that might cause a change in the value.
 */
const VALID_SCREEN_ATTRIBUTES = {
  angle       : { events : ['deviceorientation', 'move'] },
  availHeight : { events : ['deviceorientation', 'move'] },
  availWidth  : { events : ['deviceorientation', 'move'] },
  colorDepth  : { events : ['move'] },
  height      : { events : ['deviceorientation', 'move'] },
  orientation : { events : ['deviceorientation', 'move'] },
  pixelDepth  : { events : ['move'] },
  width       : { events : ['deviceorientation', 'move'] }
}

/**
 * Object defining the valid `visualViewport` attributes and associated events that might cause a change in the value.
 */
const VALID_VISUAL_VIEWPORT_ATTRIBUTES = {
  height     : { events : ['deviceorientation', 'resize'] },
  // TOOD: not totally sure about these next four; what events are necessary?
  offsetLeft : { events : ['deviceorientation', 'resize', 'scroll'] },
  offsetTop  : { events : ['deviceorientation', 'resize', 'scroll'] },
  pageLeft   : { events : ['deviceorientation', 'resize', 'scroll'] },
  pageTop    : { events : ['deviceorientation', 'resize', 'scroll'] },
  // 'scale': very complicated, hard to detect
  width      : { events : ['deviceorientation', 'resize'] }
}

/**
 * Object defining the valid `window` attributes and associated events that might cause a change in the value.
 */
const VALID_WINDOW_ATTRIBUTES = {
  innerHeight : { events : ['deviceorientation', 'resize'] },
  innerWidth  : { events : ['deviceorientation', 'resize'] },
  outerHeight : { events : ['deviceorientation', 'resize'] },
  outerWidth  : { events : ['deviceorientation', 'resize'] },
  screenLeft  : { events : ['deviceorientation', 'move', 'resize'] },
  screenTop   : { events : ['deviceorientation', 'move', 'resize'] },
  screenX     : { events : ['deviceorientation', 'move', 'resize'] },
  screenY     : { events : ['deviceorientation', 'move', 'resize'] },
  scrollX     : { events : ['deviceorientation', 'move', 'resize', 'scroll'] },
  scrollY     : { events : ['deviceorientation', 'move', 'resize', 'scroll'] }
}

/**
 * Function to generate plugins to extract and pass along `screen` related data.
 * 
 * @param {string} attribute - The `screen` attribute to track.
 */
const makeScreenPlugin = (attribute) => makePlugin(window.screen, 'screen', attribute, VALID_SCREEN_ATTRIBUTES)
const makeVisualViewportPlugin = (attribute) =>
  makePlugin(window.visualViewport, 'visualViewport', attribute, VALID_VISUAL_VIEWPORT_ATTRIBUTES)
const makeWindowPlugin = (attribute) => makePlugin(window, 'window', attribute, VALID_WINDOW_ATTRIBUTES)

const allScreenPlugins = () => Object.keys(VALID_SCREEN_ATTRIBUTES).map((attribute) => makeScreenPlugin(attribute))
const allVisualViewportPlugins = () =>
  Object.keys(VALID_VISUAL_VIEWPORT_ATTRIBUTES).map((attribute) => makeVisualViewportPlugin(attribute))
const allWindowPlugins = () => Object.keys(VALID_WINDOW_ATTRIBUTES).map((attribute) => makeWindowPlugin(attribute))

const allPlugins = () => [breakpointPlugin, ...allScreenPlugins(), ...allVisualViewportPlugins(), ...allWindowPlugins()]

export {
  allPlugins,
  allScreenPlugins,
  allVisualViewportPlugins,
  allWindowPlugins,
  makeScreenPlugin,
  makeVisualViewportPlugin,
  makeWindowPlugin,
  VALID_SCREEN_ATTRIBUTES,
  VALID_VISUAL_VIEWPORT_ATTRIBUTES,
  VALID_WINDOW_ATTRIBUTES
}
