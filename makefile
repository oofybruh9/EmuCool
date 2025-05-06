# This Makefile is for building the EmuCool project, a frontend for emulators.
# It compiles the main source file and links against the necessary libraries.
# Ensure you have the required libraries installed and adjust the paths as necessary.
# Make sure to have g++ and gdb installed on your system.
# This Makefile assumes a Unix-like environment. Adjust the commands if you're using a different OS.
# The project structure is assumed to have a `src` directory for source files and an `include` directory for headers.
# The `lib` directory is assumed to contain the necessary libraries for linking.
# The `~/SDL3` path is assumed to be where the SDL3 library is installed. Adjust as necessary.

EmuCool: src/main.cpp
	g++ src/main.cpp -o build/EmuCool -Iinclude -Llib -L~/SDL3 -lSDL3 -lSDL3_image -lSDL3_ttf
	@echo "Build complete. Run build/EmuCool to start the emulation frontend."
clean:
	rm -f build/EmuCool
	@echo "Cleaned up build folder."
