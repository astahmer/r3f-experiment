import "./App.css";

import { ChakraProvider, Flex, extendTheme } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "react-query";

import { AppCanvas } from "./components/AppCanvas";
import { MazeCanvas } from "./maze/MazeCanvas";

const queryClient = new QueryClient();

const theme = extendTheme({ config: { initialColorMode: "light" } });

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ChakraProvider theme={theme}>
                <Flex direction="column" boxSize="100%">
                    {/* <AppCanvas /> */}
                    <MazeCanvas />
                </Flex>
            </ChakraProvider>
        </QueryClientProvider>
    );
}

export default App;
