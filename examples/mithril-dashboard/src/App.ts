import m from 'mithril';
import { Box, Stack, Heading, Text, Button } from '@ts-query/ui-mithril';

const App: m.Component = {
  view: () => {
    return m(Box, { p: 4, bg: '#1a202c', color: 'white', rounded: 8 }, [
      m(Heading, { level: 2 }, 'ts-query Mithril Dashboard (WIP)'),
      m(Box, { mt: 2 }, [
        m(
          Text,
          'This will become the ticket dashboard demo using ts-query, a Mithril UI kit, and a zustand-like store.',
        ),
      ]),
      m(Box, { mt: 4 }, [
        m(Stack, { direction: 'row', gap: 3 }, [
          m(Button, { colorScheme: 'blue' }, 'Open Tickets'),
          m(Button, { variant: 'outline', colorScheme: 'gray' }, 'Summary'),
        ]),
      ]),
    ]);
  },
};

export default App;
