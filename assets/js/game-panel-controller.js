(function () {
  function createGamePanelController(element) {
    var panel = null;
    if (element && typeof element.closest === 'function') {
      panel = element.closest('details.collapsible-panel');
    }

    var active = panel ? !!panel.open : true;
    var listeners = new Set();
    var managedEvents = [];

    function attachEvent(entry) {
      if (entry.attached || !entry.target || !entry.target.addEventListener) {
        return;
      }
      entry.target.addEventListener(entry.type, entry.handler, entry.options);
      entry.attached = true;
    }

    function detachEvent(entry) {
      if (!entry.attached || !entry.target || !entry.target.removeEventListener) {
        return;
      }
      entry.target.removeEventListener(entry.type, entry.handler, entry.options);
      entry.attached = false;
    }

    function notify(activeState) {
      managedEvents.forEach(function (entry) {
        if (activeState) {
          attachEvent(entry);
        } else {
          detachEvent(entry);
        }
      });
      listeners.forEach(function (callback) {
        try {
          callback(activeState);
        } catch (error) {
          setTimeout(function () {
            throw error;
          });
        }
      });
    }

    function updateActivity(nextState) {
      var normalizedState = !!nextState;
      if (normalizedState === active) {
        return;
      }
      active = normalizedState;
      notify(active);
    }

    function handleOpening() {
      updateActivity(true);
    }

    function handleClosing() {
      updateActivity(false);
    }

    function handleToggle() {
      if (!panel) return;
      updateActivity(panel.open);
    }

    if (panel) {
      panel.addEventListener('collapsible-panel:opening', handleOpening);
      panel.addEventListener('collapsible-panel:closing', handleClosing);
      panel.addEventListener('toggle', handleToggle);
    }

    return {
      isActive: function () {
        return active;
      },
      onChange: function (callback, options) {
        if (typeof callback !== 'function') {
          return function () {};
        }
        listeners.add(callback);
        var immediate = !options || options.immediate !== false;
        if (immediate) {
          callback(active);
        }
        return function () {
          listeners.delete(callback);
        };
      },
      addManagedEvent: function (target, type, handler, eventOptions) {
        if (!target || typeof target.addEventListener !== 'function') {
          return function () {};
        }
        var entry = {
          target: target,
          type: type,
          handler: handler,
          options: eventOptions,
          attached: false,
        };
        managedEvents.push(entry);
        if (active) {
          attachEvent(entry);
        }
        return function () {
          var index = managedEvents.indexOf(entry);
          if (index >= 0) {
            managedEvents.splice(index, 1);
          }
          detachEvent(entry);
        };
      },
      destroy: function () {
        if (panel) {
          panel.removeEventListener('collapsible-panel:opening', handleOpening);
          panel.removeEventListener('collapsible-panel:closing', handleClosing);
          panel.removeEventListener('toggle', handleToggle);
        }
        managedEvents.forEach(detachEvent);
        managedEvents.length = 0;
        listeners.clear();
      },
    };
  }

  if (!window.createGamePanelController) {
    window.createGamePanelController = createGamePanelController;
  }
})();
