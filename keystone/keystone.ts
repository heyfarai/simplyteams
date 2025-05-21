// Welcome to Keystone!
//
// This file is what Keystone uses as the entry-point to your headless backend
//
// Keystone imports the default export of this file, expecting a Keystone configuration object
//   you can find out more at https://keystonejs.com/docs/apis/config

import { config } from "@keystone-6/core";
import { lists } from "./schema";
import { statelessSessions } from "@keystone-6/core/session";

// authentication is configured separately here too, but you might move this elsewhere
// when you write your list-level access control functions, as they typically rely on session data
import { withAuth } from "./auth";

const session = statelessSessions({
  secret: "your-super-secret-key-that-should-be-changed-in-production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
});

export const keystoneConfig = config({
  db: {
    // we're using sqlite for the fastest startup experience
    //   for more information on what database might be appropriate for you
    //   see https://keystonejs.com/docs/guides/choosing-a-database#title
    provider: "sqlite",
    url: "file:./keystone.db",
  },
  lists,
  session,
});

export default withAuth(keystoneConfig);
