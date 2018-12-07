import React, { Component } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import {
  TapGestureHandler,
  State,
  LongPressGestureHandler,
} from 'react-native-gesture-handler';
import PropTypes from 'prop-types';

const HIT_SLOP = 20;
const TOUCHABLE_STATE = {
  UNDETERMINED: 0,
  BEGAN: 1,
  MOVED_OUTSIDE: 2,
  END: 3,
};

export class TouchableWithoutFeedback extends Component {
  static propTypes = {
    // TODO
    accessible: PropTypes.bool,
    accessibilityLabel: PropTypes.node,
    accessibilityHint: PropTypes.string,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    onPress: PropTypes.func,
    onPressIn: PropTypes.func,
    onPressOut: PropTypes.func,
    onLayout: PropTypes.func,
    onLongPress: PropTypes.func,
    nativeID: PropTypes.string,
    testID: PropTypes.string,
    delayPressIn: PropTypes.number,
    delayPressOut: PropTypes.number,
    delayLongPress: PropTypes.number,
  };

  longPressTimeout;
  pressInTimeout;
  pressOutTimeout;

  longPressDetected = false;

  STATE = TOUCHABLE_STATE.UNDETERMINED;

  onPressIn = () => {};

  handlePressIn = () => {
    if (this.props.delayPressIn) {
      this.pressInTimeout = setTimeout(
        () => this.moveToState(TOUCHABLE_STATE.BEGAN),
        this.props.delayPressIn
      );
    } else {
      this.moveToState(TOUCHABLE_STATE.BEGAN);
    }
  };

  handleMoveOutside = () => {
    if (this.props.delayPressOut) {
      this.pressOutTimeout =
        this.pressOutTimeout ||
        setTimeout(() => {
          this.moveToState(TOUCHABLE_STATE.MOVED_OUTSIDE);
          this.pressOutTimeout = null;
        }, this.props.delayPressOut);
    } else {
      this.moveToState(TOUCHABLE_STATE.MOVED_OUTSIDE);
    }
  };

  handleGoToUndermined = () => {
    clearTimeout(this.pressOutTimeout);
    if (this.props.delayPressOut) {
      this.pressOutTimeout = setTimeout(() => {
        this.moveToState(TOUCHABLE_STATE.UNDETERMINED);
        this.pressOutTimeout = null;
      }, this.props.delayPressOut);
    } else {
      this.moveToState(TOUCHABLE_STATE.UNDETERMINED);
    }
  };

  moveToState = newState => {
    if (newState === this.STATE) {
      return;
    }
    if (newState === TOUCHABLE_STATE.BEGAN) {
      this.props.onPressIn && this.props.onPressIn();
    } else if (newState === TOUCHABLE_STATE.MOVED_OUTSIDE) {
      this.props.onPressOut && this.props.onPressOut();
    } else if (
      newState === TOUCHABLE_STATE.UNDETERMINED &&
      this.STATE === TOUCHABLE_STATE.BEGAN
    ) {
      this.props.onPressOut && this.props.onPressOut();
    }
    this.onStateChange && this.onStateChange(this.STATE, newState);
    this.STATE = newState;
  };

  onTapStateChange = ({ nativeEvent }) => {
    const { state } = nativeEvent;
    if (
      state === State.BEGAN &&
      this.STATE === TOUCHABLE_STATE.UNDETERMINED &&
      this.isWithinBounds(nativeEvent)
    ) {
      clearTimeout(this.pressOutTimeout);
      this.pressOutTimeout = null;
      this.handlePressIn();
    } else if (state === State.END) {
      clearTimeout(this.pressInTimeout);
      if (this.isWithinBounds(nativeEvent)) {
        if (this.STATE === TOUCHABLE_STATE.UNDETERMINED) {
          this.moveToState(TOUCHABLE_STATE.BEGAN);
        }
      }
      clearTimeout(this.longPressTimeout);

      if (
        !this.longPressDetected &&
        this.STATE !== TOUCHABLE_STATE.MOVED_OUTSIDE
      ) {
        this.props.onPress && this.props.onPress();
      }
      this.handleGoToUndermined();
      this.longPressDetected = false;
    }
  };

  onLongPressStateChange = ({ nativeEvent: { state } }) => {
    if (state === State.ACTIVE && this.props.onLongPress) {
      this.longPressDetected = true;
      this.props.onLongPress();
    }
  };

  componentWillUnmount() {
    clearTimeout(this.longPressTimeout);
    clearTimeout(this.pressInTimeout);
    clearTimeout(this.pressOutTimeout);
    this.pressOutTimeout = null;
  }

  onMoveIn = () => {
    if (this.STATE === TOUCHABLE_STATE.MOVED_OUTSIDE) {
      this.moveToState(TOUCHABLE_STATE.BEGAN);
    }
  };

  onMoveOut = () => {
    clearTimeout(this.longPressTimeout);
    if (this.STATE === TOUCHABLE_STATE.BEGAN) {
      this.handleMoveOutside();
    }
  };

  onLayout = ({
    nativeEvent: {
      layout: { width, height },
    },
  }) => {
    this.width = width;
    this.height = height;
  };

  isWithinBounds = ({ x, y }) =>
    x > 0 && x < this.width && y > 0 && y < this.height;

  renderChildren(children) {
    return children;
  }
  tap = React.createRef();
  long = React.createRef();
  render() {
    const extraProps = {
      accessible: this.props.accessible !== false,
      accessibilityLabel: this.props.accessibilityLabel,
      accessibilityHint: this.props.accessibilityHint,
      accessibilityComponentType: this.props.accessibilityComponentType,
      accessibilityRole: this.props.accessibilityRole,
      accessibilityStates: this.props.accessibilityStates,
      accessibilityTraits: this.props.accessibilityTraits,
      nativeID: this.props.nativeID,
      testID: this.props.testID,
      onLayout: this.props.onLayout,
      hitSlop: this.props.hitSlop,
    };
    return (
      <TapGestureHandler
        onHandlerStateChange={this.onTapStateChange}
        maxDurationMs={100000}
        ref={this.tap}
        hitSlop={HIT_SLOP}
        simultaneousHandlers={this.long}
        onMoveOut={this.onMoveOut}
        onMoveIn={this.onMoveIn}
        shouldCancelWhenOutside={false}>
        <Animated.View
          {...extraProps}
          style={[this.style, this.state && this.state.extraUnderlayStyle]}
          onLayout={this.onLayout}>
          <LongPressGestureHandler
            onHandlerStateChange={this.onLongPressStateChange}
            minDurationMs={
              (this.props.delayPressIn || 0) + this.props.delayLongPress
            }
            ref={this.long}
            simultaneousHandlers={this.tap}>
            {this.renderChildren(this.props.children)}
          </LongPressGestureHandler>
        </Animated.View>
      </TapGestureHandler>
    );
  }
}
TouchableWithoutFeedback.defaultProps = {
  delayLongPress: 600,
};

export class TouchableOpacity extends TouchableWithoutFeedback {
  getChildStyleOpacityWithDefault = () => {
    const childStyle = StyleSheet.flatten(this.props.style) || {};
    return childStyle.opacity == null ? 1 : childStyle.opacity;
  };

  opacity = new Animated.Value(this.getChildStyleOpacityWithDefault());
  style = {
    opacity: this.opacity,
  };

  setOpacityTo = (value, duration) => {
    Animated.timing(this.opacity, {
      toValue: value,
      duration: duration,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  };
  onStateChange = (from, to) => {
    if (to === TOUCHABLE_STATE.BEGAN) {
      this.setOpacityTo(this.props.activeOpacity, 0);
    } else if (
      to === TOUCHABLE_STATE.UNDETERMINED ||
      to === TOUCHABLE_STATE.MOVED_OUTSIDE
    ) {
      this.setOpacityTo(this.getChildStyleOpacityWithDefault(), 150);
    }
  };
}

TouchableOpacity.defaultProps = {
  ...TouchableWithoutFeedback.defaultProps,
  activeOpacity: 0.2,
};

export class TouchableHighlight extends TouchableWithoutFeedback {
  state = {
    extraChildStyle: null,
    extraUnderlayStyle: {
      backgroundColor: 'black',
    },
  };

  showUnderlay = () => {
    this.setState({
      /*    extraChildStyle: {
        opacity: this.props.activeOpacity,
      },*/
      extraUnderlayStyle: {
        backgroundColor: this.props.underlayColor,
      },
    });
    this.props.onShowUnderlay && this.props.onShowUnderlay();
  };

  hideUnderlay = () => {
    this.setState({
      extraChildStyle: null,
      extraUnderlayStyle: null,
    });
    this.props.onHideUnderlay && this.props.onHideUnderlay();
  };

  renderChildren(children) {
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      style: StyleSheet.compose(
        child.props.style,
        this.state.extraChildStyle
      ),
    });
  }

  onStateChange = (from, to) => {
    if (to === TOUCHABLE_STATE.BEGAN) {
      this.showUnderlay();
    } else if (
      to === TOUCHABLE_STATE.UNDETERMINED ||
      to === TOUCHABLE_STATE.MOVED_OUTSIDE
    ) {
      this.hideUnderlay();
    }
  };
}

TouchableHighlight.defaultProps = {
  ...TouchableWithoutFeedback.defaultProps,
  activeOpacity: 0.85,
  delayPressOut: 100,
  underlayColor: 'black',
};
