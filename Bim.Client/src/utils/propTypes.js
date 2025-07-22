import PropTypes from 'prop-types';

export const NotificationsPropTypes = {
  notifications: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onMarkAllRead: PropTypes.func.isRequired
};

export const LayoutPropTypes = {
  collapsed: PropTypes.bool,
  onCollapse: PropTypes.func,
  userData: PropTypes.object
};
