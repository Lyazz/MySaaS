#include <flutter/dart_project.h>
#include <flutter/flutter_view_controller.h>
#include <windows.h>

#include "flutter_window.h"
#include "utils.h"

int APIENTRY wWinMain(_In_ HINSTANCE instance, _In_opt_ HINSTANCE prev,
                      _In_ wchar_t *command_line, _In_ int show_command) {
  // Attach to console when present (e.g., 'flutter run') or create a
  // new console when running with a debugger.
  if (!::AttachConsole(ATTACH_PARENT_PROCESS) && ::IsDebuggerPresent()) {
    CreateAndAttachConsole();
  }

  // Initialize COM, so that it is available for use in the library and/or
  // plugins.
  ::CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

  flutter::DartProject project(L"data");

  std::vector<std::string> command_line_arguments =
      GetCommandLineArguments();

  project.set_dart_entrypoint_arguments(std::move(command_line_arguments));

  FlutterWindow window(project);
  Win32Window::Point origin(10, 10);
  Win32Window::Size size(1280, 720);
  if (!window.Create(L"admin_app", origin, size)) {
    return EXIT_FAILURE;
  }
  window.SetQuitOnClose(true);

  ::MSG msg;
  while (::GetMessage(&msg, nullptr, 0, 0)) {
    ::TranslateMessage(&msg);
    ::DispatchMessage(&msg);
  }

  ::CoUninitialize();
  return EXIT_SUCCESS;
}

extern "C" {
    unsigned long long __std_find_first_of_trivial_pos_1(const char* First1, unsigned long long Count1, const char* First2, unsigned long long Count2) {
        for (unsigned long long i = 0; i < Count1; ++i) {
            for (unsigned long long j = 0; j < Count2; ++j) {
                if (First1[i] == First2[j]) {
                    return i;
                }
            }
        }
        return (unsigned long long)-1;
    }

    unsigned long long __std_find_last_of_trivial_pos_1(const char* First1, unsigned long long Count1, const char* First2, unsigned long long Count2) {
        for (long long i = (long long)Count1 - 1; i >= 0; --i) {
            for (unsigned long long j = 0; j < Count2; ++j) {
                if (First1[i] == First2[j]) {
                    return (unsigned long long)i;
                }
            }
        }
        return (unsigned long long)-1;
    }

    void* __std_remove_8(void* First, void* Last, const void* Val) {
        unsigned long long* first = (unsigned long long*)First;
        unsigned long long* last = (unsigned long long*)Last;
        unsigned long long val = *(const unsigned long long*)Val;
        
        unsigned long long* result = first;
        for (; first != last; ++first) {
            if (!(*first == val)) {
                *result = *first;
                ++result;
            }
        }
        return result;
    }
}
