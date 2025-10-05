import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function MyComponent() {
  return <div>My Component</div>;
}

vi.mock("./myFetchFunction", () => ({
  myFetchFunction: () => Promise.resolve(["1", "2", "3"]),
}));

test("MyComponent renders the values returned from myFetchFunction", async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <MyComponent />
    </QueryClientProvider>
  );

  expect(await screen.findByText("My Component")).toBeInTheDocument();
});
