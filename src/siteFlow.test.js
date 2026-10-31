import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";

jest.mock("jspdf", () => function(){});
jest.mock("jspdf-autotable", () => () => {});
jest.mock("xlsx", () => ({}));
jest.mock("recharts", () => new Proxy({}, { get: () => () => null }));
let mockAuthUser = null;
let mockProfile = null;
const mockRpc = jest.fn();

jest.mock("./services/firebase", () => ({ auth: {}, db: {} }));
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (_a, cb) => { setTimeout(() => cb(mockAuthUser), 0); return () => {}; },
  signOut: jest.fn(), signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(), sendPasswordResetEmail: jest.fn(),
}));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(), onSnapshot: () => () => {}, query: jest.fn(), where: jest.fn(),
  getFirestore: jest.fn(), orderBy: jest.fn(), doc: jest.fn(), updateDoc: jest.fn(), addDoc: jest.fn(),
}));
jest.mock("./services/supabaseClient", () => {
  const chain = () => {
    const c = {};
    ["select","eq","order","limit","in","is","neq","insert","update","delete","gte","lte"].forEach(k => { c[k] = () => c; });
    c.maybeSingle = () => Promise.resolve({ data: global.__row ?? null, error: null });
    c.then = (res) => res({ data: [], error: null });
    return c;
  };
  return { supabase: { from: (t) => { global.__lastTable = t; if (t === "users") { const c = chain(); c.maybeSingle = () => Promise.resolve({ data: global.__userRow, error: null }); return c; } if (t === "training_access") { const c = chain(); c.maybeSingle = () => Promise.resolve({ data: global.__access ?? null, error: null }); return c; } return chain(); }, rpc: (...a) => mockRpc(...a), channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }), removeChannel: () => {} } };
});

beforeAll(() => {
  window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.scrollTo = () => {};
});

const App = require("./App").default;

const clickNav = (label) => fireEvent.click(screen.getAllByRole("button", { name: label })[0]);

test("public sites: navigation, tiers, login pages", async () => {
  mockAuthUser = null;
  render(<App />);
  await screen.findByRole("button", { name: "Login" });
  // Puzzle Project nav has the product links + Donate
  ["Home","About","The Puzzle Box","Puzzle Play","Donate"].forEach(l => expect(screen.getAllByText(l).length).toBeGreaterThan(0));
  expect(screen.queryByText("Start Training")).toBeNull();
  expect(screen.getByText("Contact Us")).toBeInTheDocument();

  // -> The Puzzle Box home
  clickNav("The Puzzle Box");
  await screen.findByText("A tiered system for education and clinical contexts");

  ["How it works","Training","Purchase","Login"].forEach(l => expect(screen.getAllByRole("button",{name:l}).length).toBeGreaterThan(0));
  expect(screen.queryByRole("button",{name:"Donate"})).toBeNull();
  expect(screen.getAllByText(/The Puzzle Box Screener training/).length).toBe(2);
  expect(document.body.textContent).not.toMatch(/PuzzleBox/);

  // Tier 1 sign up -> Login in register mode, restricted role
  fireEvent.click(screen.getByRole("button", { name: /Sign up as Teachers/ }));
  await screen.findByText("Create your account");
  expect(screen.getByText(/Tier 1 — Teachers & Primary Healthcare/)).toBeInTheDocument();
  expect(screen.getByText("Teacher / Primary healthcare practitioner")).toBeInTheDocument();
  expect(screen.queryByText("Psychologist")).toBeNull();
});

test("logged-in educator: landing buttons, product number gate, sidebar", async () => {
  mockAuthUser = { uid: "u1", email: "t@school.za" };
  global.__userRow = { id: "u1", name: "Nomsa Dlamini", email: "t@school.za", role: "educator", staff_number: "S1", is_verified: true };
  global.__access = null;
  mockRpc.mockReset(); mockRpc.mockResolvedValueOnce({ data: "invalid", error: null }).mockResolvedValueOnce({ data: "ok", error: null });
  render(<App />);
  
  const input = await screen.findByLabelText("Product number");
  fireEvent.change(input, { target: { value: "bad" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock training" }));
  await screen.findByText(/didn't recognise that Product number/);
  fireEvent.change(input, { target: { value: "PB-GOOD" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock training" }));
  await screen.findByText("Training modules");
  expect(mockRpc).toHaveBeenCalledWith("redeem_product_number", { p_user_id: "u1", p_email: "t@school.za", p_product_number: "PB-GOOD" });
  expect(screen.getByText("Introduction to The Puzzle Box")).toBeInTheDocument();
  
});
