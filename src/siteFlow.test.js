import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";

jest.mock("jspdf", () => function(){});
jest.mock("jspdf-autotable", () => () => {});
jest.mock("xlsx", () => ({}));
jest.mock("recharts", () => new Proxy({}, { get: () => () => null }));
let mockAuthUser = null;
let mockProfile = null;
const mockRpc = jest.fn();

jest.mock("./firebase", () => ({ auth: {}, db: {} }));
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (_a, cb) => { setTimeout(() => cb(mockAuthUser), 0); return () => {}; },
  signOut: jest.fn(), signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(), sendPasswordResetEmail: jest.fn(),
}));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(), onSnapshot: () => () => {}, query: jest.fn(), where: jest.fn(),
  getFirestore: jest.fn(), orderBy: jest.fn(), doc: jest.fn(), updateDoc: jest.fn(), addDoc: jest.fn(),
})); 
jest.mock("./supabaseClient", () => {
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

test("public sites: navigation, tiers, training, purchase, donate, Puzzle Play", async () => {
  mockAuthUser = null;
  render(<App />);
  await screen.findByText(/No child left behind/i);
  // Puzzle Project nav has the product links + Donate
  ["Home","About","The Puzzle Box","Puzzle Play","Donate"].forEach(l => expect(screen.getAllByRole("button",{name:l}).length).toBeGreaterThan(0));
  expect(screen.queryByText("Start Training")).toBeNull();
  expect(screen.getByText("Contact Us")).toBeInTheDocument();

  // -> The Puzzle Box home
  clickNav("The Puzzle Box");
  await screen.findByText("A tiered system for education and clinical contexts");
  expect(screen.getByText("295+")).toBeInTheDocument();
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
  fireEvent.click(screen.getByLabelText("Back to home"));

  // Tier 2 login
  await screen.findByText("A tiered system for education and clinical contexts");
  fireEvent.click(screen.getByRole("button", { name: /Log in as Psychologists/ }));
  await screen.findByText("Welcome back");
  expect(screen.getByText(/Tier 2 — Psychologists/)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Back to home"));

  // Training page
  await screen.findByText("A tiered system for education and clinical contexts");
  clickNav("Training");
  await screen.findByText("What the training entails");
  ["Why training is required","Where training takes place","Who administers the training","Qualification needed before training"].forEach(t => expect(screen.getByText(t)).toBeInTheDocument());
  expect(screen.getByText(/SACE registration/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: /Tier 2/ }));
  expect(screen.getByText(/HPCSA/)).toBeInTheDocument();
  expect(screen.getByText("How to access the training")).toBeInTheDocument();
  expect(screen.queryByText("Start Training")).toBeNull();

  // Purchase
  clickNav("Purchase");
  await screen.findByText("Buy The Puzzle Box Screener");
  expect(screen.getByText("A unique Product number")).toBeInTheDocument();

  // How it works
  clickNav("How it works");
  await screen.findByText("How The Puzzle Box works");

  // footer link back to project, then donate
  fireEvent.click(screen.getByText("The Puzzle Project"));
  await screen.findByText(/No child left behind/i);
  clickNav("Donate");
  await screen.findByText("Put puzzles in more classrooms");
  expect(screen.getByText("The Puzzle Box Screener")).toBeInTheDocument();
  expect(screen.getByText(/R25.000/)).toBeInTheDocument();
  expect(screen.getAllByRole("button",{name:/R1.000/}).length).toBe(2);
  expect(screen.getAllByPlaceholderText("Custom amount (R)").length).toBe(2);

  // Puzzle Play
  clickNav("Puzzle Play");
  await screen.findByText(/Nationwide puzzle development/);
  ["How it works","Purchase","Login"].forEach(l => expect(screen.getAllByRole("button",{name:l}).length).toBeGreaterThan(0));
  expect(screen.queryByRole("button",{name:"Training"})).toBeNull();
  clickNav("Purchase");
  await screen.findByText("Underwater");
  ["Shapes","Soccer","Farm"].forEach(n => expect(screen.getByText(n)).toBeInTheDocument());
  expect(screen.getByText("4 piece puzzle + lesson plan")).toBeInTheDocument();
  expect(screen.getByText("30 piece puzzle + lesson plan")).toBeInTheDocument();
  clickNav("Login");
  await screen.findByText("Puzzle Play login");
  expect(screen.getByText("To be developed")).toBeInTheDocument();
});

test("logged-in educator: landing buttons, product number gate, sidebar", async () => {
  mockAuthUser = { uid: "u1", email: "t@school.za" };
  global.__userRow = { id: "u1", name: "Nomsa Dlamini", email: "t@school.za", role: "educator", staff_number: "S1", is_verified: true };
  global.__access = null;
  mockRpc.mockReset(); mockRpc.mockResolvedValueOnce({ data: "invalid", error: null }).mockResolvedValueOnce({ data: "ok", error: null });
  render(<App />);
  await screen.findByText("Welcome, Nomsa");
  expect(screen.getByText("Buy The Puzzle Box Screener")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Training"));
  const input = await screen.findByLabelText("Product number");
  fireEvent.change(input, { target: { value: "bad" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock training" }));
  await screen.findByText(/didn't recognise that Product number/);
  fireEvent.change(input, { target: { value: "PB-GOOD" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock training" }));
  await screen.findByText("Training modules");
  expect(mockRpc).toHaveBeenCalledWith("redeem_product_number", { p_user_id: "u1", p_email: "t@school.za", p_product_number: "PB-GOOD" });
  expect(screen.getByText("Introduction to The Puzzle Box")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Continue to my dashboard →"));
  await waitFor(() => expect(screen.getAllByText(/Training/).length).toBeGreaterThan(0));
  expect(screen.getByRole("button", { name: /Buy The Puzzle Box Screener/ })).toBeInTheDocument();
});
