import { NextResponse } from "next/server";

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;

export async function POST(req: Request) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    );
  }
  const query = `mutation Register($name: String!, $email: String!, $password: String!) {
    createUser(data: { name: $name, email: $email, password: $password }) {
      id
      name
      email
    }
    authenticateUserWithPassword(email: $email, password: $password) {
      ... on UserAuthenticationWithPasswordSuccess {
        sessionToken
        item { id name email }
      }
      ... on UserAuthenticationWithPasswordFailure {
        message
      }
    }
  }`;
  const res = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { name, email, password } }),
  });
  const { data, errors } = await res.json();
  if (errors) {
    return NextResponse.json(
      { error: "Server error", details: errors },
      { status: 500 }
    );
  }
  const result = data.authenticateUserWithPassword;
  if (result.sessionToken) {
    // Set the session cookie
    const response = NextResponse.json({ user: result.item });
    response.cookies.set("keystonejs-session", result.sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      // secure: process.env.NODE_ENV === "production",
    });
    return response;
  } else {
    return NextResponse.json(
      { error: result.message || "Registration failed" },
      { status: 400 }
    );
  }
}
